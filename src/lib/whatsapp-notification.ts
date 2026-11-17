/**
 * WhatsApp Notification Service (Server-side)
 * IT Service Business System - AD Computer
 *
 * Mendukung pengiriman notifikasi pesan instan ke WhatsApp melalui provider resmi:
 * 1. Fonnte API (Official Indonesian WhatsApp Gateway - Active Device)
 * 2. Meta WhatsApp Business Cloud API (Official Meta Graph API v20.0)
 * 3. Generic Webhook API
 *
 * Fitur:
 * - Multi-penerima: Mengirim notifikasi ke Admin sekaligus Customer
 * - Non-blocking: Aman dipanggil tanpa menahan response request HTTP utama
 * - Independent fault tolerance: Kegagalan WhatsApp tidak mengganggu alur sistem atau Telegram
 * - Deduplication protection: Mencegah pesan ganda akibat double-click atau event berulang
 * - Sanitasi dan validasi nomor WhatsApp Indonesia (awalan 08 / +62 diubah ke 628)
 * - Keamanan kredensial: Token Fonnte/Meta hanya diakses di environment server
 */

import { formatWhatsAppNumber } from '@/lib/whatsapp';
import { APP_CONFIG } from '@/lib/config';

export type WhatsAppProviderType = 'meta' | 'fonnte' | 'generic' | 'unconfigured';

export interface WhatsAppSendResult {
  success: boolean;
  provider: WhatsAppProviderType;
  messageId?: string;
  error?: string;
}

export interface WhatsAppMessageOptions {
  to?: string;
  text: string;
  templateName?: string;
  templateParams?: string[];
  event?: string;
  data?: Record<string, any>;
}

export interface OrderNotificationPayload {
  ticketNumber: string;
  customerName: string;
  customerId?: string | null;
  customerPhone?: string | null;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serviceType: string;
  problemDescription: string;
  preferredSchedule?: Date | string | null;
  createdAt?: Date | string | null;
  serviceName?: string | null;
}

export interface QuotationResponsePayload {
  ticketNumber: string;
  customerName: string;
  quotationNumber: string;
  action: 'APPROVED' | 'REJECTED';
}

export interface OrderStatusNotificationPayload {
  customerId?: string | null;
  customerPhone?: string | null;
  customerName: string;
  ticketNumber: string;
  deviceInfo: string;
  newStatus: string;
  adminNotes?: string | null;
}

// In-memory deduplication cache untuk mencegah pengiriman pesan ganda akibat retry cepat
const recentNotifications = new Map<string, number>();

export function isDuplicateNotification(key: string, ttlMs = 8000): boolean {
  const now = Date.now();
  const lastTime = recentNotifications.get(key);
  if (lastTime && now - lastTime < ttlMs) {
    return true;
  }
  recentNotifications.set(key, now);

  // Bersihkan cache lama jika melebihi 200 entri
  if (recentNotifications.size > 200) {
    recentNotifications.forEach((time, k) => {
      if (now - time > ttlMs) recentNotifications.delete(k);
    });
  }
  return false;
}

/**
 * Pemetaan status teknis sistem ke bahasa Indonesia yang ramah pelanggan.
 */
export function mapOrderStatusToIndonesian(status: string): string {
  const normalized = status.toUpperCase().trim();
  switch (normalized) {
    case 'SUBMITTED':
      return 'Menunggu Konfirmasi';
    case 'PENDING':
      return 'Menunggu Antrean';
    case 'DIAGNOSING':
      return 'Sedang Diperiksa (Diagnosa Lab)';
    case 'WAITING_APPROVAL':
    case 'QUOTED':
      return 'Menunggu Persetujuan Penawaran Biaya';
    case 'IN_PROGRESS':
    case 'IN_REPAIR':
      return 'Sedang Dikerjakan';
    case 'WAITING_SPAREPART':
      return 'Menunggu Sparepart';
    case 'READY_FOR_PICKUP':
      return 'Selesai (Siap Diambil)';
    case 'COMPLETED':
      return 'Selesai';
    case 'DELIVERED':
      return 'Selesai (Unit Telah Diambil/Diserahkan)';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return status;
  }
}

/**
 * Menentukan apakah status servis tergolong selesai.
 */
export function isStatusCompleted(status: string): boolean {
  const normalized = status.toUpperCase().trim();
  return (
    normalized === 'COMPLETED' ||
    normalized === 'DELIVERED' ||
    normalized === 'READY_FOR_PICKUP' ||
    normalized === 'SELESAI'
  );
}

/**
 * Cek apakah notifikasi WhatsApp ke Customer diaktifkan di konfigurasi.
 * Default: true jika tidak dimatikan secara eksplisit.
 */
export function isWhatsAppNotifyCustomerEnabled(): boolean {
  const val = (process.env.WHATSAPP_NOTIFY_CUSTOMER || 'true').toLowerCase().trim();
  return val === 'true' || val === '1' || val === 'yes';
}

/**
 * Cek apakah notifikasi WhatsApp ke Admin diaktifkan di konfigurasi.
 * Default: true.
 */
export function isWhatsAppNotifyAdminEnabled(): boolean {
  const val = (process.env.WHATSAPP_NOTIFY_ADMIN || 'true').toLowerCase().trim();
  return val === 'true' || val === '1' || val === 'yes';
}

/**
 * Deteksi provider WhatsApp yang aktif berdasarkan environment variables.
 */
export function getWhatsAppProvider(): WhatsAppProviderType {
  const explicit = (process.env.WHATSAPP_PROVIDER || '').toLowerCase().trim();
  if (explicit === 'fonnte') return 'fonnte';
  if (explicit === 'meta') return 'meta';
  if (explicit === 'generic') return 'generic';

  // Deteksi otomatis jika tidak diset secara eksplisit
  if (process.env.WHATSAPP_API_TOKEN) {
    return 'fonnte';
  }
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    return 'meta';
  }
  if (process.env.WHATSAPP_WEBHOOK_URL) {
    return 'generic';
  }

  return 'unconfigured';
}

/**
 * Ambil nomor WhatsApp Admin tujuan notifikasi.
 * Mengutamakan WHATSAPP_ADMIN_RECIPIENT, dengan fallback ke konfigurasi nomor WhatsApp bisnis di .env.
 */
export function getAdminWhatsAppRecipient(): string {
  const raw =
    process.env.WHATSAPP_ADMIN_RECIPIENT ||
    process.env.WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_COMPANY_PHONE ||
    '';
  return formatWhatsAppNumber(raw);
}

/**
 * Validasi apakah nomor WhatsApp valid (panjang minimal 10 digit, hanya angka).
 */
export function isValidWhatsAppNumber(phone?: string | null): boolean {
  if (!phone) return false;
  const cleaned = formatWhatsAppNumber(phone);
  return /^\d{10,16}$/.test(cleaned);
}

/**
 * Cek apakah WhatsApp notification telah terkonfigurasi dengan lengkap di server.
 */
export function isWhatsAppConfigured(): boolean {
  const provider = getWhatsAppProvider();
  if (provider === 'unconfigured') return false;

  if (provider === 'fonnte') {
    return Boolean(process.env.WHATSAPP_API_TOKEN?.trim());
  }

  if (provider === 'meta') {
    return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() && process.env.WHATSAPP_ACCESS_TOKEN?.trim());
  }

  if (provider === 'generic') {
    return Boolean(process.env.WHATSAPP_WEBHOOK_URL?.trim());
  }

  return false;
}

/**
 * Kirim pesan via Fonnte API (Official Indonesian WhatsApp Gateway).
 */
async function sendViaFonnte(to: string, text: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_API_TOKEN?.trim() || '';

  if (!token) {
    return {
      success: false,
      provider: 'fonnte',
      error: 'WHATSAPP_API_TOKEN belum dikonfigurasi.',
    };
  }

  const url = 'https://api.fonnte.com/send';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: to,
        message: text,
        countryCode: '62',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.status === false) {
      const errMsg = data?.reason || data?.detail || `HTTP ${res.status}`;
      console.error('[WHATSAPP-FONNTE] Gagal kirim notifikasi WhatsApp ke:', to, 'Penyebab:', errMsg);
      return { success: false, provider: 'fonnte', error: errMsg };
    }

    const messageId = String(Array.isArray(data?.id) ? data.id[0] : data?.id || Date.now());
    console.log('[WHATSAPP-FONNTE] Notifikasi berhasil dikirim ke:', to, '| ID:', messageId);
    return { success: true, provider: 'fonnte', messageId };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errText = err?.name === 'AbortError' ? 'Koneksi timeout (12 detik)' : err?.message || 'Network error';
    console.error('[WHATSAPP-FONNTE] Error saat menghubungi Fonnte API:', errText);
    return { success: false, provider: 'fonnte', error: errText };
  }
}

/**
 * Kirim pesan via Meta WhatsApp Business Cloud API (Official Meta Graph API v20.0).
 */
async function sendViaMeta(
  to: string,
  text: string,
  options?: { templateName?: string; templateParams?: string[] }
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '';

  if (!token || !phoneNumberId) {
    return {
      success: false,
      provider: 'meta',
      error: 'WHATSAPP_ACCESS_TOKEN atau WHATSAPP_PHONE_NUMBER_ID belum dikonfigurasi.',
    };
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  let payload: any;
  if (options?.templateName) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: options.templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'id' },
        components: options.templateParams?.length
          ? [
              {
                type: 'body',
                parameters: options.templateParams.map((p) => ({ type: 'text', text: p })),
              },
            ]
          : undefined,
      },
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      console.error('[WHATSAPP-META] Gagal kirim notifikasi WhatsApp:', errMsg);
      return { success: false, provider: 'meta', error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log('[WHATSAPP-META] Notifikasi WhatsApp berhasil terkirim. ID:', messageId);
    return { success: true, provider: 'meta', messageId };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errText = err?.name === 'AbortError' ? 'Koneksi timeout (12 detik)' : err?.message || 'Network error';
    console.error('[WHATSAPP-META] Error saat menghubungi Meta API:', errText);
    return { success: false, provider: 'meta', error: errText };
  }
}

/**
 * Kirim notifikasi via Generic Webhook URL.
 */
async function sendViaGenericWebhook(
  to: string,
  text: string,
  extra?: Record<string, any>
): Promise<WhatsAppSendResult> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim() || '';

  if (!webhookUrl) {
    return {
      success: false,
      provider: 'generic',
      error: 'WHATSAPP_WEBHOOK_URL belum dikonfigurasi.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.WHATSAPP_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN.trim()}`;
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to,
        message: text,
        ...extra,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      console.error('[WHATSAPP-WEBHOOK] Gagal kirim webhook WhatsApp:', errText);
      return { success: false, provider: 'generic', error: errText };
    }

    console.log('[WHATSAPP-WEBHOOK] Webhook notifikasi WhatsApp berhasil dikirim.');
    return { success: true, provider: 'generic' };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errText = err?.name === 'AbortError' ? 'Koneksi timeout (12 detik)' : err?.message || 'Network error';
    console.error('[WHATSAPP-WEBHOOK] Error webhook WhatsApp:', errText);
    return { success: false, provider: 'generic', error: errText };
  }
}

/**
 * Kirim pesan WhatsApp menggunakan provider yang aktif.
 */
export async function sendWhatsAppMessage(options: WhatsAppMessageOptions): Promise<WhatsAppSendResult> {
  const provider = getWhatsAppProvider();

  if (provider === 'unconfigured') {
    console.warn(
      '[WHATSAPP] Belum dikonfigurasi (kredensial provider WhatsApp belum diatur di environment server).'
    );
    return {
      success: false,
      provider: 'unconfigured',
      error: 'WhatsApp belum dikonfigurasi di environment server.',
    };
  }

  const recipient = formatWhatsAppNumber(options.to || getAdminWhatsAppRecipient());
  if (!isValidWhatsAppNumber(recipient)) {
    console.warn(`[WHATSAPP] Nomor tujuan tidak valid: "${recipient}"`);
    return {
      success: false,
      provider,
      error: `Nomor telepon tujuan (${recipient}) tidak valid.`,
    };
  }

  if (provider === 'fonnte') {
    return sendViaFonnte(recipient, options.text);
  }

  if (provider === 'meta') {
    return sendViaMeta(recipient, options.text, {
      templateName: options.templateName,
      templateParams: options.templateParams,
    });
  }

  return sendViaGenericWebhook(recipient, options.text, {
    event: options.event,
    data: options.data,
  });
}

// ============================================================================
// FORMATTER PESAN WHATSAPP SESUAI SPESIFIKASI PROYEK
// ============================================================================

/**
 * EVENT A: Format pesan WhatsApp ke Customer saat membuat pesanan servis baru.
 */
export function formatCustomerNewOrderMessage(params: {
  customerName: string;
  ticketNumber: string;
  deviceInfo: string;
  problemDescription: string;
  orderDate?: Date | string | null;
}): string {
  const dateStr = params.orderDate
    ? new Date(params.orderDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  return (
    `Halo ${params.customerName}!\n\n` +
    `Terima kasih telah mempercayakan perangkat Anda kepada AD Computer.\n\n` +
    `Pesanan servis Anda berhasil kami terima.\n\n` +
    `Detail Pesanan:\n` +
    `- Nomor Pesanan: #${params.ticketNumber}\n` +
    `- Perangkat: ${params.deviceInfo}\n` +
    `- Keluhan: ${params.problemDescription}\n` +
    `- Tanggal: ${dateStr}\n\n` +
    `Silakan tunggu informasi selanjutnya dari tim AD Computer.\n\n` +
    `Terima kasih!`
  );
}

/**
 * EVENT B: Format pesan WhatsApp ke Customer saat status servis berubah.
 */
export function formatCustomerStatusUpdateMessage(params: {
  customerName: string;
  ticketNumber: string;
  deviceInfo: string;
  newStatus: string;
  adminNotes?: string | null;
}): string {
  const statusLabel = mapOrderStatusToIndonesian(params.newStatus);
  const notes = params.adminNotes && params.adminNotes.trim().length > 0 ? params.adminNotes.trim() : '-';

  return (
    `Halo ${params.customerName}!\n\n` +
    `Ada pembaruan status servis perangkat Anda di AD Computer.\n\n` +
    `Nomor Pesanan: #${params.ticketNumber}\n` +
    `Perangkat: ${params.deviceInfo}\n` +
    `Status Terbaru: ${statusLabel}\n\n` +
    `Catatan Admin: ${notes}\n\n` +
    `Terima kasih telah menggunakan layanan AD Computer.`
  );
}

/**
 * EVENT C: Format pesan WhatsApp khusus ke Customer saat servis telah selesai.
 */
export function formatCustomerServiceCompletedMessage(params: {
  customerName: string;
  ticketNumber: string;
  deviceInfo: string;
}): string {
  return (
    `Halo ${params.customerName}!\n\n` +
    `Kabar baik! Servis perangkat Anda sudah selesai.\n\n` +
    `Nomor Pesanan: #${params.ticketNumber}\n` +
    `Perangkat: ${params.deviceInfo}\n\n` +
    `Silakan hubungi atau kunjungi AD Computer untuk informasi pengambilan perangkat.\n\n` +
    `Terima kasih!`
  );
}

/**
 * Format pesan WhatsApp untuk Admin/Teknisi saat status servis berubah.
 */
export function formatInternalStatusUpdateMessage(params: {
  ticketNumber: string;
  customerName: string;
  deviceInfo: string;
  newStatus: string;
  adminNotes?: string | null;
}): string {
  const appUrl = APP_CONFIG.url || 'http://localhost:3000';
  const appName = APP_CONFIG.name || 'AD Computer';
  const statusLabel = mapOrderStatusToIndonesian(params.newStatus);
  const notes = params.adminNotes && params.adminNotes.trim().length > 0 ? params.adminNotes.trim() : '-';

  return (
    `*NOTIFIKASI ${appName.toUpperCase()}*\n` +
    `Pembaruan status servis.\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*Nomor Pesanan:* #${params.ticketNumber}\n` +
    `*Customer:* ${params.customerName}\n` +
    `*Perangkat:* ${params.deviceInfo}\n` +
    `*Status Terbaru:* ${statusLabel}\n` +
    `*Catatan:* ${notes}\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `Dashboard Admin: ${appUrl}/admin/orders`
  );
}

/**
 * Format pesan WhatsApp untuk Admin/Teknisi saat servis telah selesai.
 */
export function formatInternalServiceCompletedMessage(params: {
  ticketNumber: string;
  customerName: string;
  deviceInfo: string;
}): string {
  const appUrl = APP_CONFIG.url || 'http://localhost:3000';
  const appName = APP_CONFIG.name || 'AD Computer';

  return (
    `*NOTIFIKASI ${appName.toUpperCase()}*\n` +
    `Servis telah selesai dikerjakan.\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*Nomor Pesanan:* #${params.ticketNumber}\n` +
    `*Customer:* ${params.customerName}\n` +
    `*Perangkat:* ${params.deviceInfo}\n` +
    `*Status:* Selesai\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `Silakan koordinasikan pengambilan/pengembalian unit dengan customer.\n` +
    `Dashboard Admin: ${appUrl}/admin/orders`
  );
}

/**
 * Format pesan teks WhatsApp untuk Admin saat pesanan servis baru masuk.
 */
export function formatNewOrderWhatsAppMessage(order: OrderNotificationPayload): string {
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
  const problem =
    order.problemDescription.length > 300
      ? order.problemDescription.substring(0, 300) + '...'
      : order.problemDescription;

  const appUrl = APP_CONFIG.url || 'http://localhost:3000';
  const appName = APP_CONFIG.name || 'AD Computer';

  return (
    `*NOTIFIKASI ${appName.toUpperCase()}*\n` +
    `Pesanan servis baru telah diterima.\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*Nomor Pesanan:* #${order.ticketNumber}\n` +
    `*Nama Customer:* ${order.customerName}\n` +
    `*Perangkat:* ${order.deviceType} — ${order.deviceBrand} ${order.deviceModel}\n` +
    (order.serviceName ? `*Layanan:* ${order.serviceName}\n` : '') +
    `*Tipe Layanan:* ${serviceLabel}\n` +
    `*Jadwal:* ${scheduleStr}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*Keluhan:*\n_${problem}_\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `Silakan buka dashboard Admin untuk melihat detail pesanan:\n` +
    `${appUrl}/admin/orders`
  );
}

/**
 * Format pesan WhatsApp untuk respon persetujuan/penolakan quotation oleh customer.
 */
export function formatQuotationResponseWhatsAppMessage(data: QuotationResponsePayload): string {
  const appUrl = APP_CONFIG.url || 'http://localhost:3000';
  const appName = APP_CONFIG.name || 'AD Computer';
  const isApproved = data.action === 'APPROVED';

  return (
    `*NOTIFIKASI ${appName.toUpperCase()}*\n` +
    `Respon Surat Penawaran (Quotation)\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*Nomor Tiket:* #${data.ticketNumber}\n` +
    `*Nomor Quotation:* ${data.quotationNumber}\n` +
    `*Customer:* ${data.customerName}\n` +
    `*Status:* ${isApproved ? 'DISETUJUI (APPROVED) ✅' : 'DITOLAK (REJECTED) ⚠️'}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    (isApproved
      ? 'Customer telah menyetujui estimasi biaya penawaran. Teknisi dapat segera memproses pengerjaan unit servis.'
      : 'Customer menolak estimasi biaya penawaran. Mohon admin/teknisi segera menghubungi customer untuk tindak lanjut.') +
    `\n━━━━━━━━━━━━━━━━━━━\n\n` +
    `Dashboard Admin: ${appUrl}/admin/orders`
  );
}

// ============================================================================
// HANDLER PENGIRIMAN NOTIFIKASI EVENT
// ============================================================================

/**
 * EVENT A (CUSTOMER): Notifikasi konfirmasi pesanan servis baru ke WhatsApp Customer.
 */
export async function notifyNewOrderCustomerWhatsApp(order: OrderNotificationPayload): Promise<WhatsAppSendResult> {
  if (!isWhatsAppNotifyCustomerEnabled()) {
    console.log('[WHATSAPP] Notifikasi customer dinonaktifkan di konfigurasi (WHATSAPP_NOTIFY_CUSTOMER=false)');
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'Notifikasi customer via WhatsApp dinonaktifkan.',
    };
  }

  if (!order.customerPhone) {
    console.log(`[WHATSAPP] Customer (${order.customerName}) tidak memiliki nomor telepon terdaftar.`);
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'Nomor telepon customer tidak tersedia.',
    };
  }

  const cleanedPhone = formatWhatsAppNumber(order.customerPhone);
  if (!isValidWhatsAppNumber(cleanedPhone)) {
    console.warn(`[WHATSAPP] Nomor WhatsApp customer tidak valid: "${order.customerPhone}"`);
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: `Nomor WhatsApp customer tidak valid (${order.customerPhone}).`,
    };
  }

  if (!isWhatsAppConfigured()) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'WhatsApp provider belum dikonfigurasi.',
    };
  }

  const dedupKey = `NEW_ORDER_CUSTOMER:${order.ticketNumber}`;
  if (isDuplicateNotification(dedupKey)) {
    console.log(`[WHATSAPP] Notifikasi pesanan baru ke customer #${order.ticketNumber} dilewati (duplikat dalam 8 detik).`);
    return { success: true, provider: getWhatsAppProvider(), messageId: 'duplicate-skipped' };
  }

  const deviceInfo = `${order.deviceType} — ${order.deviceBrand} ${order.deviceModel}`.trim();
  const messageText = formatCustomerNewOrderMessage({
    customerName: order.customerName,
    ticketNumber: order.ticketNumber,
    deviceInfo,
    problemDescription: order.problemDescription,
    orderDate: order.createdAt || new Date(),
  });

  return sendWhatsAppMessage({
    to: cleanedPhone,
    text: messageText,
    event: 'NEW_ORDER_CUSTOMER',
    data: {
      ticketNumber: order.ticketNumber,
      customerName: order.customerName,
    },
  });
}

/**
 * EVENT A (ADMIN): Notifikasi pesanan servis baru masuk ke WhatsApp Admin.
 */
export async function notifyNewOrderWhatsApp(order: OrderNotificationPayload): Promise<WhatsAppSendResult> {
  if (!isWhatsAppNotifyAdminEnabled()) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'Notifikasi admin dinonaktifkan di konfigurasi (WHATSAPP_NOTIFY_ADMIN=false).',
    };
  }

  const adminRecipient = getAdminWhatsAppRecipient();

  if (!isWhatsAppConfigured()) {
    console.warn(
      `[WHATSAPP] Notifikasi pesanan #${order.ticketNumber} dilewati: Kredensial provider WhatsApp belum diatur di environment (.env).`
    );
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'WhatsApp belum dikonfigurasi di environment server.',
    };
  }

  if (!isValidWhatsAppNumber(adminRecipient)) {
    console.warn(`[WHATSAPP] Nomor admin tujuan tidak valid: "${adminRecipient}"`);
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: `Nomor admin recipient (${adminRecipient}) tidak valid.`,
    };
  }

  const dedupKey = `NEW_ORDER_ADMIN:${order.ticketNumber}`;
  if (isDuplicateNotification(dedupKey)) {
    console.log(`[WHATSAPP] Notifikasi pesanan baru ke admin #${order.ticketNumber} dilewati (duplikat dalam 8 detik).`);
    return { success: true, provider: getWhatsAppProvider(), messageId: 'duplicate-skipped' };
  }

  const messageText = formatNewOrderWhatsAppMessage(order);
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || undefined;
  const templateParams = [
    order.ticketNumber,
    order.customerName,
    `${order.deviceBrand} ${order.deviceModel}`,
    order.problemDescription.slice(0, 100),
  ];

  return sendWhatsAppMessage({
    to: adminRecipient,
    text: messageText,
    templateName,
    templateParams,
    event: 'NEW_ORDER',
    data: {
      ticketNumber: order.ticketNumber,
      customerName: order.customerName,
    },
  });
}

/**
 * EVENT B & C (CUSTOMER): Notifikasi perubahan status pengerjaan servis ke nomor WhatsApp Customer.
 * - Jika status selesai (COMPLETED / DELIVERED / READY_FOR_PICKUP) -> Menggunakan Template C
 * - Jika status update berkala (DIAGNOSING / IN_PROGRESS / dll) -> Menggunakan Template B
 */
export async function notifyOrderStatusToCustomerWhatsApp(
  data: OrderStatusNotificationPayload
): Promise<WhatsAppSendResult> {
  if (!isWhatsAppNotifyCustomerEnabled()) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'Notifikasi customer via WhatsApp dinonaktifkan di konfigurasi (WHATSAPP_NOTIFY_CUSTOMER=false)',
    };
  }

  if (!data.customerPhone) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'Customer tidak memiliki nomor telepon terdaftar.',
    };
  }

  const cleanedPhone = formatWhatsAppNumber(data.customerPhone);
  if (!isValidWhatsAppNumber(cleanedPhone)) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: `Nomor WhatsApp customer tidak valid (${data.customerPhone}).`,
    };
  }

  if (!isWhatsAppConfigured()) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'WhatsApp provider belum dikonfigurasi.',
    };
  }

  const dedupKey = `STATUS_UPDATE:${data.ticketNumber}:${data.newStatus}`;
  if (isDuplicateNotification(dedupKey)) {
    console.log(`[WHATSAPP] Notifikasi status #${data.ticketNumber} (${data.newStatus}) dilewati (duplikat dalam 8 detik).`);
    return { success: true, provider: getWhatsAppProvider(), messageId: 'duplicate-skipped' };
  }

  // Pilih Template C jika servis telah selesai, atau Template B untuk update progres servis
  const messageText = isStatusCompleted(data.newStatus)
    ? formatCustomerServiceCompletedMessage({
        customerName: data.customerName,
        ticketNumber: data.ticketNumber,
        deviceInfo: data.deviceInfo,
      })
    : formatCustomerStatusUpdateMessage({
        customerName: data.customerName,
        ticketNumber: data.ticketNumber,
        deviceInfo: data.deviceInfo,
        newStatus: data.newStatus,
        adminNotes: data.adminNotes,
      });

  return sendWhatsAppMessage({
    to: cleanedPhone,
    text: messageText,
    event: isStatusCompleted(data.newStatus) ? 'CUSTOMER_ORDER_COMPLETED' : 'CUSTOMER_STATUS_UPDATE',
    data: {
      ticketNumber: data.ticketNumber,
      customerName: data.customerName,
      status: data.newStatus,
    },
  });
}

/**
 * Notifikasi Respon Quotation ke WhatsApp Admin.
 */
export async function notifyQuotationResponseWhatsApp(data: QuotationResponsePayload): Promise<WhatsAppSendResult> {
  if (!isWhatsAppNotifyAdminEnabled()) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'Notifikasi admin dinonaktifkan di konfigurasi.',
    };
  }

  const adminRecipient = getAdminWhatsAppRecipient();

  if (!isWhatsAppConfigured() || !isValidWhatsAppNumber(adminRecipient)) {
    return {
      success: false,
      provider: getWhatsAppProvider(),
      error: 'WhatsApp belum dikonfigurasi.',
    };
  }

  const dedupKey = `QUOTATION_RESPOND:${data.quotationNumber}:${data.action}`;
  if (isDuplicateNotification(dedupKey)) {
    return { success: true, provider: getWhatsAppProvider(), messageId: 'duplicate-skipped' };
  }

  const text = formatQuotationResponseWhatsAppMessage(data);
  return sendWhatsAppMessage({
    to: adminRecipient,
    text,
    event: 'QUOTATION_RESPOND',
    data,
  });
}
