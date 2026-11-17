import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { NotificationEvents, dispatchStatusNotifications } from '@/lib/notifications';

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

    const orders = await prisma.serviceOrder.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        service: true,
        diagnosis: true,
        quotation: {
          include: {
            items: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('[ADMIN_ORDERS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data order servis.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const { orderId, status, notes } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, message: 'ID order dan status baru wajib diisi.' },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: 'Tiket order tidak ditemukan.' },
        { status: 404 }
      );
    }

    const isStatusChanged = existingOrder.status !== status;

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status },
      include: { customer: true },
    });

    // Send notifications only if status actually changed (mencegah pesan ganda / duplikat)
    const deviceInfo = `${updatedOrder.deviceBrand} ${updatedOrder.deviceModel}`;
    if (isStatusChanged) {
      if (status === 'COMPLETED' || status === 'DELIVERED' || status === 'READY_FOR_PICKUP') {
        await NotificationEvents.serviceCompleted(
          updatedOrder.customerId,
          updatedOrder.ticketNumber,
          deviceInfo
        );
      } else {
        await NotificationEvents.orderStatusChanged(
          updatedOrder.customerId,
          updatedOrder.ticketNumber,
          status,
          deviceInfo
        );
      }

      // WhatsApp notification to Customer (Event B / Event C) dan
      // penerima internal Admin/Teknisi sesuai Konfigurasi Notifikasi (non blocking).
      void dispatchStatusNotifications({
        customerId: updatedOrder.customerId,
        customerPhone: updatedOrder.customer?.phone,
        customerName: updatedOrder.customer?.name || 'Customer',
        ticketNumber: updatedOrder.ticketNumber,
        deviceInfo,
        newStatus: status,
        adminNotes: typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Status order #${updatedOrder.ticketNumber} diperbarui menjadi ${status}.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('[ADMIN_ORDERS_PATCH_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui status order.' },
      { status: 500 }
    );
  }
}
