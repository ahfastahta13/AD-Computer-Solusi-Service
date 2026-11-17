/**
 * Telegram Notification Helper
 * Mengirim notifikasi real-time ke Telegram via Bot API.
 *
 * Konfigurasi di .env.local:
 *   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
 *   TELEGRAM_CHAT_ID=123456789
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

export interface TelegramConnectionCheck {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  botUsername?: string;
  chatType?: string;
  chatName?: string;
  error?: string;
}

/**
 * Pemeriksaan koneksi Telegram TANPA mengirim pesan:
 * memanggil getMe (validasi bot token) dan getChat (validasi chat ID).
 * Token tidak pernah dikembalikan atau dicatat ke log.
 */
export async function checkTelegramConnection(timeoutMs = 8000): Promise<TelegramConnectionCheck> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return {
      ok: false,
      httpStatus: null,
      latencyMs: 0,
      error: 'Bot token atau Chat ID belum dikonfigurasi.',
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const meResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`, {
      signal: controller.signal,
    });
    const meData: any = await meResponse.json().catch(() => null);

    if (!meResponse.ok || !meData?.ok) {
      return {
        ok: false,
        httpStatus: meResponse.status,
        latencyMs: Date.now() - startedAt,
        error: `Bot token ditolak Telegram (HTTP ${meResponse.status}).`,
      };
    }

    const chatResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}`,
      { signal: controller.signal }
    );
    const chatData: any = await chatResponse.json().catch(() => null);
    const botUsername = meData?.result?.username as string | undefined;

    if (!chatResponse.ok || !chatData?.ok) {
      return {
        ok: false,
        httpStatus: chatResponse.status,
        latencyMs: Date.now() - startedAt,
        botUsername,
        error: `Bot valid, tetapi Chat ID tidak dapat diakses (HTTP ${chatResponse.status}).`,
      };
    }

    const chat = chatData?.result || {};
    const chatName =
      chat.title ||
      [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
      chat.username ||
      undefined;

    return {
      ok: true,
      httpStatus: chatResponse.status,
      latencyMs: Date.now() - startedAt,
      botUsername,
      chatType: chat.type,
      chatName,
    };
  } catch (error) {
    const err = error as Error;
    const isTimeout = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    return {
      ok: false,
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
      error: isTimeout
        ? 'Koneksi ke Telegram timeout.'
        : 'Gagal menghubungi Telegram.',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kirim pesan teks ke Telegram (HTML parse mode).
 * Non-blocking — aman dipanggil tanpa await.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!isTelegramConfigured()) {
    console.warn('[TELEGRAM] Belum dikonfigurasi (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID kosong).');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[TELEGRAM] Gagal kirim pesan (status=${res.status}):`, err);
      return false;
    }

    console.log('[TELEGRAM] Pesan berhasil dikirim.');
    return true;
  } catch (error) {
    console.error('[TELEGRAM] Error kirim pesan:', error);
    return false;
  }
}

/**
 * Notifikasi: Order servis baru masuk.
 */
export function notifyNewOrderTelegram(order: {
  ticketNumber: string;
  customerName: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serviceType: string;
  problemDescription: string;
  preferredSchedule?: Date | string | null;
  serviceName?: string | null;
}): void {
  const scheduleStr = order.preferredSchedule
    ? (typeof order.preferredSchedule === 'string'
        ? new Date(order.preferredSchedule)
        : order.preferredSchedule
      ).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Fleksibel / Sesuai Antrean';

  const serviceLabel = order.serviceType === 'onsite' ? '🚚 Onsite (Kunjungan)' : '🛠 Workshop (Antar ke Toko)';
  const problem = order.problemDescription.length > 300
    ? order.problemDescription.substring(0, 300) + '...'
    : order.problemDescription;

  const text =
    `🔔 <b>ORDER SERVIS BARU!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🎫 Tiket: <b>#${order.ticketNumber}</b>\n` +
    `👤 Customer: <b>${escapeHtml(order.customerName)}</b>\n` +
    `💻 Perangkat: ${escapeHtml(order.deviceType)} — ${escapeHtml(order.deviceBrand)} ${escapeHtml(order.deviceModel)}\n` +
    (order.serviceName ? `🧩 Layanan: ${escapeHtml(order.serviceName)}\n` : '') +
    `📌 Tipe: ${serviceLabel}\n` +
    `📅 Jadwal: ${scheduleStr}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🧾 Keluhan:\n<i>${escapeHtml(problem)}</i>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🌐 Login admin: http://localhost:3000/admin/orders`;

  // Fire-and-forget: jangan blokir response order
  void sendTelegramMessage(text);
}

/** Escape karakter HTML agar aman untuk Telegram HTML parse mode. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Notifikasi: Respon persetujuan atau penolakan Quotation oleh customer.
 */
export function notifyQuotationResponseTelegram(data: {
  ticketNumber: string;
  customerName: string;
  quotationNumber: string;
  action: 'APPROVED' | 'REJECTED';
}): void {
  const isApproved = data.action === 'APPROVED';
  const statusLabel = isApproved ? 'DISETUJUI (APPROVED) ✅' : 'DITOLAK (REJECTED) ⚠️';

  const text =
    `🔔 <b>RESPON QUOTATION BIAYA SERVIS</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🎫 Tiket: <b>#${data.ticketNumber}</b>\n` +
    `📋 Quotation: <b>${data.quotationNumber}</b>\n` +
    `👤 Customer: <b>${escapeHtml(data.customerName)}</b>\n` +
    `📌 Status: <b>${statusLabel}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    (isApproved
      ? 'Customer telah menyetujui rincian biaya penawaran. Teknisi dapat segera memproses perbaikan unit.'
      : 'Customer menolak rincian biaya penawaran. Mohon admin/teknisi segera menghubungi customer.') +
    `\n━━━━━━━━━━━━━━━━━━━\n` +
    `🌐 Dashboard admin: http://localhost:3000/admin/orders`;

  void sendTelegramMessage(text);
}
