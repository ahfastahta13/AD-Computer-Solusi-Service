import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error('[SERVICES_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data layanan.' },
      { status: 500 }
    );
  }
}
