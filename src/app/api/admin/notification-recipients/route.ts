import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import {
  ensureDefaultAdminRecipient,
  parseRecipientInput,
} from '@/lib/notification-recipients';
import {
  getWhatsAppProvider,
  isWhatsAppConfigured,
  isWhatsAppNotifyAdminEnabled,
  isWhatsAppNotifyCustomerEnabled,
} from '@/lib/whatsapp-notification';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { error: 'Tidak terotorisasi.', status: 401 as const };

  const payload = await verifyJWT(token);
  if (!payload || payload.role !== 'ADMIN') {
    return { error: 'Akses khusus Administrator.', status: 403 as const };
  }
  return { payload };
}

// GET: daftar penerima + status konfigurasi provider (tanpa membocorkan token)
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    // Seed awal dari nomor admin environment bila konfigurasi masih kosong.
    await ensureDefaultAdminRecipient().catch(() => null);

    const [recipients, customers] = await Promise.all([
      prisma.notificationRecipient.findMany({
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      }),
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      recipients,
      customers,
      config: {
        provider: getWhatsAppProvider(),
        configured: isWhatsAppConfigured(),
        notifyAdminEnabled: isWhatsAppNotifyAdminEnabled(),
        notifyCustomerEnabled: isWhatsAppNotifyCustomerEnabled(),
      },
    });
  } catch (error) {
    console.error('[ADMIN_NOTIFICATION_RECIPIENTS_GET_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil konfigurasi notifikasi.' },
      { status: 500 }
    );
  }
}

// POST: tambah penerima baru
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Format data tidak valid.' }, { status: 400 });
    }

    const parsed = parseRecipientInput(body, 'create');
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.errors[0], errors: parsed.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Nomor unik — cegah pengiriman ganda ke nomor yang sama.
    const existing = await prisma.notificationRecipient.findUnique({
      where: { phone: data.phone! },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Nomor WhatsApp tersebut sudah terdaftar sebagai penerima.' },
        { status: 409 }
      );
    }

    // Validasi akun customer bila tipe CUSTOMER.
    if (data.recipientType === 'CUSTOMER') {
      const customer = await prisma.user.findUnique({
        where: { id: data.userId as string },
        select: { id: true, role: true },
      });
      if (!customer || customer.role !== 'CUSTOMER') {
        return NextResponse.json(
          { success: false, message: 'Akun customer yang dipilih tidak valid.' },
          { status: 400 }
        );
      }
    }

    const recipient = await prisma.notificationRecipient.create({
      data: {
        name: data.name!,
        phone: data.phone!,
        recipientType: data.recipientType || 'ADMIN',
        userId: data.userId || null,
        notifyNewOrder: data.notifyNewOrder ?? true,
        notifyStatusChange: data.notifyStatusChange ?? true,
        notifyServiceCompleted: data.notifyServiceCompleted ?? true,
        isActive: data.isActive ?? true,
        notes: data.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Penerima ${recipient.name} berhasil ditambahkan.`,
      recipient,
    });
  } catch (error) {
    console.error('[ADMIN_NOTIFICATION_RECIPIENTS_POST_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan penerima notifikasi.' },
      { status: 500 }
    );
  }
}
