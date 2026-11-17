import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { NotificationEvents, dispatchExternalQuotationAlert } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak terotorisasi. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Sesi login Anda telah kadaluarsa.' },
        { status: 401 }
      );
    }

    const quotationId = params.id;
    const body = await request.json();
    const { action } = body; // 'APPROVE' | 'REJECT'

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { success: false, message: 'Aksi respon tidak valid (pilih APPROVE atau REJECT).' },
        { status: 400 }
      );
    }

    // 1. Fetch Quotation with ServiceOrder
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        serviceOrder: true,
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, message: 'Dokumen quotation tidak ditemukan.' },
        { status: 404 }
      );
    }

    // 2. Security Ownership Check: Customer can ONLY respond to their own quotation
    if (quotation.serviceOrder.customerId !== payload.userId) {
      return NextResponse.json(
        { success: false, message: 'Anda hanya dapat menyetujui atau menolak penawaran biaya milik Anda sendiri.' },
        { status: 403 }
      );
    }

    // Check if quotation is already approved/rejected
    if (quotation.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, message: 'Penawaran biaya ini sudah disetujui sebelumnya.' },
        { status: 400 }
      );
    }

    // 3. Process Respon Action
    if (action === 'APPROVE') {
      const now = new Date();

      // Transaction: Update Quotation to APPROVED, Order to IN_PROGRESS, and Create Payment record
      await prisma.$transaction(async (tx) => {
        // Update Quotation
        await tx.quotation.update({
          where: { id: quotationId },
          data: {
            status: 'APPROVED',
            approvedAt: now,
          },
        });

        // Update ServiceOrder status to IN_PROGRESS
        await tx.serviceOrder.update({
          where: { id: quotation.serviceOrderId },
          data: { status: 'IN_PROGRESS' },
        });

        // Upsert Payment Record (UNPAID)
        const existingPayment = await tx.payment.findFirst({
          where: { serviceOrderId: quotation.serviceOrderId },
        });

        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amount: quotation.total,
              paymentStatus: 'UNPAID',
            },
          });
        } else {
          await tx.payment.create({
            data: {
              serviceOrderId: quotation.serviceOrderId,
              amount: quotation.total,
              paymentMethod: 'TRANSFER_BANK',
              paymentStatus: 'UNPAID',
              notes: `Tagihan pembayaran untuk Quotation #${quotation.quotationNumber}`,
            },
          });
        }

        // Notification for Customer
        await tx.notification.create({
          data: {
            userId: payload.userId,
            title: 'Penawaran Biaya Disetujui',
            message: `Anda telah menyetujui Quotation #${quotation.quotationNumber}. Tiket #${quotation.serviceOrder.ticketNumber} kini berstatus IN_PROGRESS (Sedang Dikerjakan Teknisi).`,
            type: 'ORDER_STATUS',
            isRead: false,
          },
        });
      });

      // Notify admins (In-App DB & Multi-channel external: Telegram + WhatsApp)
      const customer = await prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true } });
      await NotificationEvents.quotationApproved(
        quotation.serviceOrder.ticketNumber,
        customer?.name || 'Customer',
        quotation.quotationNumber
      ).catch(() => {});

      void dispatchExternalQuotationAlert({
        ticketNumber: quotation.serviceOrder.ticketNumber,
        customerName: customer?.name || 'Customer',
        quotationNumber: quotation.quotationNumber,
        action: 'APPROVED',
      });

      return NextResponse.json({
        success: true,
        message: `Quotation #${quotation.quotationNumber} berhasil disetujui. Pengerjaan servis segera dimulai!`,
      });
    } else {
      // REJECT Action
      await prisma.$transaction(async (tx) => {
        await tx.quotation.update({
          where: { id: quotationId },
          data: { status: 'REJECTED' },
        });

        await tx.notification.create({
          data: {
            userId: payload.userId,
            title: 'Penawaran Biaya Ditolak',
            message: `Anda menolak Quotation #${quotation.quotationNumber}. Teknisi akan menghubungi Anda kembali.`,
            type: 'ORDER_STATUS',
            isRead: false,
          },
        });
      });

      // Notify admins about rejection (In-App DB & Multi-channel external: Telegram + WhatsApp)
      const rejectCustomer = await prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true } });
      await NotificationEvents.quotationRejected(
        quotation.serviceOrder.ticketNumber,
        rejectCustomer?.name || 'Customer',
        quotation.quotationNumber
      ).catch(() => {});

      void dispatchExternalQuotationAlert({
        ticketNumber: quotation.serviceOrder.ticketNumber,
        customerName: rejectCustomer?.name || 'Customer',
        quotationNumber: quotation.quotationNumber,
        action: 'REJECTED',
      });

      return NextResponse.json({
        success: true,
        message: `Quotation #${quotation.quotationNumber} telah ditolak.`,
      });
    }
  } catch (error) {
    console.error('[CUSTOMER_QUOTATION_RESPOND_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat memproses persetujuan quotation.' },
      { status: 500 }
    );
  }
}
