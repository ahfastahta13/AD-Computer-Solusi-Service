import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak terotorisasi.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Akses khusus Administrator.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { serviceOrderId, diagnosis, recommendation, estimatedCost } = body;

    if (!serviceOrderId || typeof serviceOrderId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'ID Tiket Servis wajib diisi.' },
        { status: 400 }
      );
    }

    if (!diagnosis || typeof diagnosis !== 'string' || diagnosis.trim().length < 5) {
      return NextResponse.json(
        { success: false, message: 'Hasil analisa diagnosa wajib diisi.' },
        { status: 400 }
      );
    }

    if (!recommendation || typeof recommendation !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Rekomendasi perbaikan/suku cadang wajib diisi.' },
        { status: 400 }
      );
    }

    const numericCost = Number(estimatedCost);
    if (isNaN(numericCost) || numericCost < 0) {
      return NextResponse.json(
        { success: false, message: 'Estimasi biaya perbaikan harus berupa angka valid.' },
        { status: 400 }
      );
    }

    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
    });

    if (!serviceOrder) {
      return NextResponse.json(
        { success: false, message: 'Tiket servis tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Create or update Diagnosis in DB
    const updatedDiagnosis = await prisma.diagnosis.upsert({
      where: { serviceOrderId },
      create: {
        serviceOrderId,
        diagnosis: diagnosis.trim(),
        recommendation: recommendation.trim(),
        estimatedCost: numericCost,
      },
      update: {
        diagnosis: diagnosis.trim(),
        recommendation: recommendation.trim(),
        estimatedCost: numericCost,
      },
    });

    // Update ServiceOrder status to WAITING_APPROVAL
    await prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { status: 'WAITING_APPROVAL' },
    });

    // Create Notification for Customer
    await prisma.notification.create({
      data: {
        userId: serviceOrder.customerId,
        title: 'Hasil Diagnosa Servis Tersedia',
        message: `Diagnosa teknis untuk tiket #${serviceOrder.ticketNumber} telah selesai. Silakan tinjau rekomendasi dan penawaran biaya.`,
        type: 'ORDER_STATUS',
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Hasil diagnosa berhasil disimpan dan status tiket diperbarui menjadi WAITING_APPROVAL.',
      diagnosis: updatedDiagnosis,
    });
  } catch (error) {
    console.error('[ADMIN_DIAGNOSIS_POST_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat menyimpan diagnosa.' },
      { status: 500 }
    );
  }
}
