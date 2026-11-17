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
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Sesi kadaluarsa.' },
        { status: 401 }
      );
    }

    // Fetch quotations linked to authenticated customer's orders
    const quotations = await prisma.quotation.findMany({
      where: {
        serviceOrder: {
          customerId: payload.userId,
        },
      },
      include: {
        items: true,
        serviceOrder: {
          include: {
            service: true,
            diagnosis: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      quotations,
    });
  } catch (error) {
    console.error('[CUSTOMER_QUOTATIONS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data penawaran harga (quotation).' },
      { status: 500 }
    );
  }
}
