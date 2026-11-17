import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    const quotations = await prisma.quotation.findMany({
      include: {
        serviceOrder: {
          include: {
            customer: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      quotations,
    });
  } catch (error) {
    console.error('[ADMIN_QUOTATIONS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data quotation.' },
      { status: 500 }
    );
  }
}

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
    const { serviceOrderId, items, discount = 0, notes, status = 'SENT' } = body;

    if (!serviceOrderId || typeof serviceOrderId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'ID Tiket Servis wajib diisi.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Rincian item penawaran (sparepart/jasa) minimal 1 item.' },
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

    // Process & calculate items
    let calculatedSubtotal = 0;
    const processedItems = items.map((item: any) => {
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const price = Math.max(0, parseFloat(item.unitPrice) || 0);
      const itemSubtotal = qty * price;
      calculatedSubtotal += itemSubtotal;
      return {
        description: String(item.description || 'Item Servis').trim(),
        quantity: qty,
        unitPrice: price,
        subtotal: itemSubtotal,
      };
    });

    const numericDiscount = Math.max(0, parseFloat(discount) || 0);
    const calculatedTotal = Math.max(0, calculatedSubtotal - numericDiscount);

    // Check if Quotation already exists for this order
    const existingQuotation = await prisma.quotation.findUnique({
      where: { serviceOrderId },
    });

    let quotationNumber = existingQuotation?.quotationNumber;
    if (!quotationNumber) {
      const randomCode = Math.floor(100 + Math.random() * 900);
      quotationNumber = `QUO-2026-${randomCode}`;
    }

    // Transaction to save Quotation and Items
    const result = await prisma.$transaction(async (tx) => {
      if (existingQuotation) {
        // Delete old items
        await tx.quotationItem.deleteMany({
          where: { quotationId: existingQuotation.id },
        });

        // Update quotation
        const updatedQuo = await tx.quotation.update({
          where: { id: existingQuotation.id },
          data: {
            subtotal: calculatedSubtotal,
            discount: numericDiscount,
            total: calculatedTotal,
            notes: notes ? String(notes).trim() : null,
            status,
            items: {
              createMany: {
                data: processedItems,
              },
            },
          },
          include: { items: true },
        });

        return updatedQuo;
      } else {
        // Create new quotation
        const newQuo = await tx.quotation.create({
          data: {
            serviceOrderId,
            quotationNumber: quotationNumber!,
            subtotal: calculatedSubtotal,
            discount: numericDiscount,
            total: calculatedTotal,
            notes: notes ? String(notes).trim() : null,
            status,
            items: {
              createMany: {
                data: processedItems,
              },
            },
          },
          include: { items: true },
        });

        return newQuo;
      }
    });

    // Update ServiceOrder status to WAITING_APPROVAL if sent
    if (status === 'SENT') {
      await prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { status: 'WAITING_APPROVAL' },
      });

      // Send Customer Notification
      await prisma.notification.create({
        data: {
          userId: serviceOrder.customerId,
          title: 'Penawaran Biaya (Quotation) Diterbitkan',
          message: `Surat penawaran resmi #${result.quotationNumber} sejumlah Rp ${result.total.toLocaleString('id-ID')} telah dikirim. Silakan setujui/tolak di Customer Portal.`,
          type: 'QUOTATION_READY',
          isRead: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Surat penawaran #${result.quotationNumber} berhasil diterbitkan!`,
      quotation: result,
    });
  } catch (error) {
    console.error('[ADMIN_QUOTATION_POST_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat membuat quotation.' },
      { status: 500 }
    );
  }
}
