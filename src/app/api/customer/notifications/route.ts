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

    const notifications = await prisma.notification.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('[CUSTOMER_NOTIFICATIONS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil notifikasi.' },
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
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Sesi kadaluarsa.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: payload.userId, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: payload.userId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifikasi telah diperbarui.',
    });
  } catch (error) {
    console.error('[CUSTOMER_NOTIFICATIONS_PATCH_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui notifikasi.' },
      { status: 500 }
    );
  }
}
