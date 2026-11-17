import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Sesi kadaluarsa.' },
        { status: 401 }
      );
    }

    const orderId = params.id;

    const order = await prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        diagnosis: true,
        quotation: {
          include: {
            items: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Tiket servis tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Security Authorization Check: Only allow owner (or Admin) to view order details
    if (order.customerId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Anda tidak memiliki hak akses untuk melihat tiket servis ini.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[CUSTOMER_ORDER_DETAIL_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil detail tiket servis.' },
      { status: 500 }
    );
  }
}
