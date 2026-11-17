import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@/lib/config';
import { sendWhatsAppMessage } from '@/lib/whatsapp-notification';
import { RECIPIENT_TYPE_LABELS, isNotificationRecipientType } from '@/lib/notification-recipients';

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

// POST: kirim pesan percobaan ke nomor penerima terpilih
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const recipient = await prisma.notificationRecipient.findUnique({
      where: { id: params.id },
    });
    if (!recipient) {
      return NextResponse.json(
        { success: false, message: 'Penerima notifikasi tidak ditemukan.' },
        { status: 404 }
      );
    }

    const typeLabel = isNotificationRecipientType(recipient.recipientType)
      ? RECIPIENT_TYPE_LABELS[recipient.recipientType]
      : 'Lainnya';

    const now = new Date().toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const text =
      `*PESAN UJI — KONFIGURASI NOTIFIKASI*\n` +
      `${APP_CONFIG.name}\n\n` +
      `Halo ${recipient.name},\n\n` +
      `Ini adalah pesan percobaan dari sistem notifikasi ${APP_CONFIG.name}.\n` +
      `Jika Anda menerima pesan ini, konfigurasi WhatsApp untuk nomor Anda berhasil.\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `*Jenis Penerima:* ${typeLabel}\n` +
      `*Waktu:* ${now}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `Pesan ini dikirim otomatis oleh Dashboard Admin.`;

    const result = await sendWhatsAppMessage({
      to: recipient.phone,
      text,
      event: 'TEST_NOTIFICATION',
      data: { recipientId: recipient.id, recipientType: recipient.recipientType },
    });

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Pesan uji berhasil dikirim ke ${recipient.name} (${recipient.phone}).`
        : `Pesan uji gagal dikirim ke ${recipient.name}.`,
      provider: result.provider,
      messageId: result.messageId || null,
      error: result.error || null,
      recipient: {
        id: recipient.id,
        name: recipient.name,
        phone: recipient.phone,
      },
    });
  } catch (error) {
    console.error('[ADMIN_NOTIFICATION_RECIPIENT_TEST_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengirim pesan uji.' },
      { status: 500 }
    );
  }
}
