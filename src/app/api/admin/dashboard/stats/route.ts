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

    // 1. Total Customers Count
    const totalCustomers = await prisma.user.count({
      where: { role: 'CUSTOMER' },
    });

    // 2. New Service Orders (SUBMITTED or PENDING)
    const newOrders = await prisma.serviceOrder.count({
      where: {
        status: { in: ['SUBMITTED', 'PENDING'] },
      },
    });

    // 3. Active Services (DIAGNOSING, WAITING_APPROVAL, IN_PROGRESS, IN_REPAIR, QUOTED)
    const activeServices = await prisma.serviceOrder.count({
      where: {
        status: { in: ['DIAGNOSING', 'WAITING_APPROVAL', 'IN_PROGRESS', 'IN_REPAIR', 'QUOTED'] },
      },
    });

    // 4. Completed Services (COMPLETED, DELIVERED, READY_FOR_PICKUP)
    const completedServices = await prisma.serviceOrder.count({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED', 'READY_FOR_PICKUP'] },
      },
    });

    // 5. Unpaid Services Count
    const unpaidServices = await prisma.payment.count({
      where: { paymentStatus: 'UNPAID' },
    });

    // 6. Total Revenue (Sum of PAID payments)
    const paidPayments = await prisma.payment.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = paidPayments._sum.amount || 0;

    // Fetch recent 5 service orders for dashboard table
    const recentOrders = await prisma.serviceOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        quotation: true,
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalCustomers,
        newOrders,
        activeServices,
        completedServices,
        unpaidServices,
        totalRevenue,
      },
      recentOrders,
    });
  } catch (error) {
    console.error('[ADMIN_DASHBOARD_STATS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil statistik dashboard admin.' },
      { status: 500 }
    );
  }
}
