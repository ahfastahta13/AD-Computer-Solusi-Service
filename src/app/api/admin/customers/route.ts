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

    // Fetch all customer users with their service orders & payments
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        serviceOrders: {
          include: {
            service: true,
            diagnosis: true,
            quotation: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute stats per customer
    const processedCustomers = customers.map((c) => {
      const totalOrders = c.serviceOrders.length;
      const completedOrders = c.serviceOrders.filter(
        (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED'
      ).length;

      const totalSpent = c.serviceOrders.reduce((sum, order) => {
        const orderPayments = order.payments.filter((p) => p.paymentStatus === 'PAID');
        const paidAmount = orderPayments.reduce((pSum, p) => pSum + p.amount, 0);
        return sum + (paidAmount || order.quotation?.total || 0);
      }, 0);

      return {
        ...c,
        totalOrders,
        completedOrders,
        totalSpent,
      };
    });

    return NextResponse.json({
      success: true,
      customers: processedCustomers,
    });
  } catch (error) {
    console.error('[ADMIN_CUSTOMERS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pelanggan.' },
      { status: 500 }
    );
  }
}
