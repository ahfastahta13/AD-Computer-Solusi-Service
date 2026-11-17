import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { NotificationEvents } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET all payments (admin) with filters
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Tidak terotorisasi.' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Akses khusus Administrator.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const payments = await prisma.payment.findMany({
      where: {
        ...(statusFilter && statusFilter !== 'ALL' ? { paymentStatus: statusFilter } : {}),
      },
      include: {
        serviceOrder: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            quotation: { select: { total: true, quotationNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by search (ticket number or customer name)
    const filtered = search
      ? payments.filter(
          (p) =>
            p.serviceOrder.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
            (p.serviceOrder.customer?.name || '').toLowerCase().includes(search.toLowerCase())
        )
      : payments;

    // Summary stats
    const allPayments = await prisma.payment.findMany();
    const stats = {
      totalUnpaid: allPayments.filter((p) => p.paymentStatus === 'UNPAID').length,
      totalPartial: allPayments.filter((p) => p.paymentStatus === 'PARTIAL').length,
      totalPaid: allPayments.filter((p) => p.paymentStatus === 'PAID').length,
      totalRevenue: allPayments
        .filter((p) => p.paymentStatus === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0),
    };

    return NextResponse.json({ success: true, payments: filtered, stats });
  } catch (error) {
    console.error('[ADMIN_PAYMENTS_GET_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data pembayaran.' }, { status: 500 });
  }
}

// POST — Admin records a new payment
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Tidak terotorisasi.' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Akses khusus Administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const { serviceOrderId, amount, paymentMethod, paymentStatus, paymentDate, notes } = body;

    if (!serviceOrderId || !amount || !paymentMethod || !paymentStatus) {
      return NextResponse.json(
        { success: false, message: 'ServiceOrderId, amount, paymentMethod, dan paymentStatus wajib diisi.' },
        { status: 400 }
      );
    }

    const order = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: { customer: true },
    });
    if (!order) {
      return NextResponse.json({ success: false, message: 'Service order tidak ditemukan.' }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        serviceOrderId,
        amount: parseFloat(amount),
        paymentMethod,
        paymentStatus,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes || null,
      },
    });

    // Auto update order status to COMPLETED if payment is PAID and order is IN_PROGRESS
    if (paymentStatus === 'PAID' && order.status === 'IN_PROGRESS') {
      await prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { status: 'COMPLETED' },
      });
    }

    // Notify customer
    await NotificationEvents.paymentRecorded(
      order.customerId,
      order.ticketNumber,
      parseFloat(amount),
      paymentMethod,
      paymentStatus
    );

    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil dicatat.',
      payment,
    });
  } catch (error) {
    console.error('[ADMIN_PAYMENTS_POST_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal mencatat pembayaran.' }, { status: 500 });
  }
}

// PATCH — Update payment status
export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Tidak terotorisasi.' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Akses khusus Administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const { paymentId, paymentStatus, notes } = body;

    if (!paymentId || !paymentStatus) {
      return NextResponse.json({ success: false, message: 'paymentId dan paymentStatus wajib diisi.' }, { status: 400 });
    }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus,
        ...(paymentStatus === 'PAID' ? { paymentDate: new Date() } : {}),
        ...(notes ? { notes } : {}),
      },
      include: {
        serviceOrder: { include: { customer: true } },
      },
    });

    // Notify customer on PAID
    if (paymentStatus === 'PAID') {
      await NotificationEvents.paymentRecorded(
        payment.serviceOrder.customerId,
        payment.serviceOrder.ticketNumber,
        payment.amount,
        payment.paymentMethod,
        'PAID'
      );
    }

    return NextResponse.json({
      success: true,
      message: `Status pembayaran diperbarui ke ${paymentStatus}.`,
      payment,
    });
  } catch (error) {
    console.error('[ADMIN_PAYMENTS_PATCH_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui pembayaran.' }, { status: 500 });
  }
}
