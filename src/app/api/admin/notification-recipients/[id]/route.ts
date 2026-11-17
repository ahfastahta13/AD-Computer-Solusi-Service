import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { parseRecipientInput } from '@/lib/notification-recipients';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { error: 'Tidak terotorisasi.', status: 401 as const };

  const payload = await verifyJWT(token);
  if (!payload || payload.role !== 'ADMIN') {
    return { error: 'Akses khusus Administrator.', status: 403 as const };
  }
  return { payload };
}

// PATCH: ubah data penerima / aktif-nonaktif
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const existing = await prisma.notificationRecipient.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Penerima notifikasi tidak ditemukan.' },
        { status: 404 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Format data tidak valid.' }, { status: 400 });
    }

    const parsed = parseRecipientInput(body, 'update');
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.errors[0], errors: parsed.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Nomor unik — cegah pengiriman ganda ke nomor yang sama.
    if (data.phone && data.phone !== existing.phone) {
      const duplicate = await prisma.notificationRecipient.findUnique({
        where: { phone: data.phone },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'Nomor WhatsApp tersebut sudah terdaftar sebagai penerima.' },
          { status: 409 }
        );
      }
    }

    const mergedType = data.recipientType || existing.recipientType;
    const mergedUserId =
      data.userId !== undefined ? data.userId : existing.userId;

    if (mergedType === 'CUSTOMER') {
      if (!mergedUserId) {
        return NextResponse.json(
          { success: false, message: 'Penerima bertipe Customer wajib dikaitkan dengan akun customer terdaftar.' },
          { status: 400 }
        );
      }
      const customer = await prisma.user.findUnique({
        where: { id: mergedUserId },
        select: { id: true, role: true },
      });
      if (!customer || customer.role !== 'CUSTOMER') {
        return NextResponse.json(
          { success: false, message: 'Akun customer yang dipilih tidak valid.' },
          { status: 400 }
        );
      }
    }

    const recipient = await prisma.notificationRecipient.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.recipientType !== undefined ? { recipientType: data.recipientType } : {}),
        userId: mergedType === 'CUSTOMER' ? mergedUserId : null,
        ...(data.notifyNewOrder !== undefined ? { notifyNewOrder: data.notifyNewOrder } : {}),
        ...(data.notifyStatusChange !== undefined ? { notifyStatusChange: data.notifyStatusChange } : {}),
        ...(data.notifyServiceCompleted !== undefined ? { notifyServiceCompleted: data.notifyServiceCompleted } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Penerima ${recipient.name} berhasil diperbarui.`,
      recipient,
    });
  } catch (error) {
    console.error('[ADMIN_NOTIFICATION_RECIPIENT_PATCH_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui penerima notifikasi.' },
      { status: 500 }
    );
  }
}

// DELETE: hapus penerima
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const existing = await prisma.notificationRecipient.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Penerima notifikasi tidak ditemukan.' },
        { status: 404 }
      );
    }

    await prisma.notificationRecipient.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `Penerima ${existing.name} berhasil dihapus.`,
    });
  } catch (error) {
    console.error('[ADMIN_NOTIFICATION_RECIPIENT_DELETE_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus penerima notifikasi.' },
      { status: 500 }
    );
  }
}
