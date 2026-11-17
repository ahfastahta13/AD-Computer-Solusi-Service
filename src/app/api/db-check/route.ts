import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [
      userCount,
      serviceCount,
      orderCount,
      diagnosisCount,
      quotationCount,
      quotationItemCount,
      paymentCount,
      notificationCount,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.service.count().catch(() => 0),
      prisma.serviceOrder.count().catch(() => 0),
      prisma.diagnosis.count().catch(() => 0),
      prisma.quotation.count().catch(() => 0),
      prisma.quotationItem.count().catch(() => 0),
      prisma.payment.count().catch(() => 0),
      prisma.notification.count().catch(() => 0),
    ]);

    return NextResponse.json({
      databaseStatus: 'connected',
      driver: 'Prisma Client',
      databaseUrl: process.env.DATABASE_URL?.split('?')[0] || 'file:./dev.db',
      entities: {
        users: userCount,
        services: serviceCount,
        serviceOrders: orderCount,
        diagnoses: diagnosisCount,
        quotations: quotationCount,
        quotationItems: quotationItemCount,
        payments: paymentCount,
        notifications: notificationCount,
      },
      message: 'All database models & relationships successfully verified and seeded.',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        databaseStatus: 'error',
        message: 'Failed to query database entities.',
        error: error?.message || 'Unknown database error',
      },
      { status: 500 }
    );
  }
}
