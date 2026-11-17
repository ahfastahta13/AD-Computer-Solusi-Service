import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { NotificationEvents, dispatchExternalOrderAlert } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET: Fetch authenticated customer's service orders
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak terotorisasi. Silakan login.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Sesi login telah kadaluarsa.' },
        { status: 401 }
      );
    }

    const orders = await prisma.serviceOrder.findMany({
      where: { customerId: payload.userId },
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('[CUSTOMER_ORDERS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data order servis.' },
      { status: 500 }
    );
  }
}

// POST: Create a new service order (Customer Booking)
export async function POST(request: Request) {
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

    // Security: customerId MUST come strictly from authenticated JWT payload
    const customerId = payload.userId;

    const body = await request.json();
    const {
      serviceId,
      deviceType,
      deviceBrand,
      deviceModel,
      problemDescription,
      attachment,
      serviceType,
      address,
      preferredSchedule,
    } = body;

    // 1. Validations
    if (!deviceType || typeof deviceType !== 'string' || !deviceType.trim()) {
      return NextResponse.json(
        { success: false, message: 'Kategori jenis perangkat (Laptop/PC/Server/Printer) wajib dipilih.' },
        { status: 400 }
      );
    }

    if (!deviceBrand || typeof deviceBrand !== 'string' || !deviceBrand.trim()) {
      return NextResponse.json(
        { success: false, message: 'Merk / Brand perangkat wajib diisi.' },
        { status: 400 }
      );
    }

    if (!deviceModel || typeof deviceModel !== 'string' || !deviceModel.trim()) {
      return NextResponse.json(
        { success: false, message: 'Tipe / Seri Model perangkat wajib diisi.' },
        { status: 400 }
      );
    }

    if (!problemDescription || typeof problemDescription !== 'string' || problemDescription.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: 'Deskripsi keluhan / kendala wajib diisi (minimal 10 karakter).' },
        { status: 400 }
      );
    }

    const validServiceTypes = ['workshop', 'onsite'];
    const selectedServiceType = serviceType && validServiceTypes.includes(serviceType) ? serviceType : 'workshop';

    if (selectedServiceType === 'onsite' && (!address || typeof address !== 'string' || !address.trim())) {
      return NextResponse.json(
        { success: false, message: 'Alamat lengkap wajib diisi untuk layanan kunjungan Onsite.' },
        { status: 400 }
      );
    }

    if (!preferredSchedule) {
      return NextResponse.json(
        { success: false, message: 'Jadwal kunjungan / penyerahan wajib dipilih.' },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(preferredSchedule);
    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Format tanggal jadwal tidak valid.' },
        { status: 400 }
      );
    }

    // 2. Generate Unique Ticket Number
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `SRV-2026-${randomCode}`;

    // 3. Create ServiceOrder in SQLite DB
    const newOrder = await prisma.serviceOrder.create({
      data: {
        ticketNumber,
        customerId,
        serviceId: serviceId || null,
        problemDescription: problemDescription.trim(),
        deviceType: deviceType.trim(),
        deviceBrand: deviceBrand.trim(),
        deviceModel: deviceModel.trim(),
        attachment: attachment ? String(attachment).trim() : null,
        serviceType: selectedServiceType,
        address: selectedServiceType === 'onsite' ? address.trim() : 'Workshop Counter Central',
        preferredSchedule: scheduleDate,
        status: 'SUBMITTED',
      },
      include: {
        service: true,
      },
    });

    // 4. Create Automated Notification for Customer
    await prisma.notification.create({
      data: {
        userId: customerId,
        title: 'Booking Servis Berhasil Dibuat',
        message: `Tiket pengajuan servis #${newOrder.ticketNumber} (${newOrder.deviceBrand} ${newOrder.deviceModel}) telah berhasil dikirim. Status saat ini: SUBMITTED.`,
        type: 'ORDER_STATUS',
        isRead: false,
      },
    });

    // 5. Notify all admins about new booking
    const customerUser = await prisma.user.findUnique({
      where: { id: customerId },
      select: { name: true, phone: true },
    });
    await NotificationEvents.bookingReceived(
      newOrder.ticketNumber,
      customerUser?.name || 'Customer',
      newOrder.deviceBrand,
      newOrder.deviceModel
    ).catch(() => {}); // non-blocking

    // 6. Send real-time notification to Telegram & WhatsApp (Admin & Customer, non-blocking)
    void dispatchExternalOrderAlert({
      ticketNumber: newOrder.ticketNumber,
      customerName: customerUser?.name || 'Customer',
      customerId: newOrder.customerId,
      customerPhone: customerUser?.phone,
      deviceType: newOrder.deviceType,
      deviceBrand: newOrder.deviceBrand,
      deviceModel: newOrder.deviceModel,
      serviceType: newOrder.serviceType,
      problemDescription: newOrder.problemDescription,
      preferredSchedule: newOrder.preferredSchedule,
      createdAt: newOrder.createdAt,
      serviceName: newOrder.service?.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Booking servis berhasil dibuat!',
      order: newOrder,
    });
  } catch (error) {
    console.error('[CUSTOMER_ORDER_CREATE_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat membuat booking servis.' },
      { status: 500 }
    );
  }
}
