import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET all payments belonging to the logged-in customer
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Tidak terotorisasi.' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ success: false, message: 'Sesi kadaluarsa.' }, { status: 401 });

    // Get all service orders with payments, quotation for this customer
    const orders = await prisma.serviceOrder.findMany({
      where: { customerId: payload.userId },
      include: {
        service: { select: { name: true } },
        quotation: { select: { total: true, quotationNumber: true, status: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute balances per order
    const ordersWithBalance = orders.map((order) => {
      const totalQuotation = order.quotation?.total || 0;
      const totalPaid = order.payments
        .filter((p) => p.paymentStatus === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);
      const partialAmount = order.payments
        .filter((p) => p.paymentStatus === 'PARTIAL')
        .reduce((sum, p) => sum + p.amount, 0);
      const totalRecorded = totalPaid + partialAmount;
      const remainingBalance = Math.max(0, totalQuotation - totalPaid);

      // Determine overall payment status
      let paymentStatus: string;
      if (totalPaid >= totalQuotation && totalQuotation > 0) {
        paymentStatus = 'PAID';
      } else if (totalRecorded > 0) {
        paymentStatus = 'PARTIAL';
      } else {
        paymentStatus = 'UNPAID';
      }

      return {
        ...order,
        totalQuotation,
        totalPaid,
        remainingBalance,
        paymentStatus,
      };
    });

    // Global summary
    const summary = {
      totalOrders: orders.length,
      totalPaid: ordersWithBalance.reduce((sum, o) => sum + o.totalPaid, 0),
      totalRemaining: ordersWithBalance.reduce((sum, o) => sum + o.remainingBalance, 0),
    };

    return NextResponse.json({
      success: true,
      orders: ordersWithBalance,
      summary,
    });
  } catch (error) {
    console.error('[CUSTOMER_PAYMENTS_GET_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data pembayaran.' }, { status: 500 });
  }
}
