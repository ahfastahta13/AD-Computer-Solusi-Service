/**
 * Helper WhatsApp integration
 * Membersihkan nomor telepon dan memformat URL WhatsApp click-to-chat
 */

/**
 * Format nomor WhatsApp internasional tanpa +, -, spasi, tanda kurung.
 * Contoh: "+62 856-2429-9894" -> "6285624299894"
 * Contoh: "085624299894" -> "6285624299894"
 */
export function formatWhatsAppNumber(phone?: string | null): string {
  if (!phone) return '';
  // Hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, '');
  
  // Jika diawali dengan 0, ubah ke 62 (kode negara Indonesia)
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Ambil nomor WhatsApp admin dari env variable (WHATSAPP_NUMBER atau NEXT_PUBLIC_WHATSAPP_NUMBER atau fallback NEXT_PUBLIC_COMPANY_PHONE)
 */
export function getWhatsAppNumber(): string {
  const envNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_COMPANY_PHONE ||
    '';
  return formatWhatsAppNumber(envNumber);
}

export interface BuildWhatsAppUrlOptions {
  userProblem?: string;
  serviceOrderId?: string;
  orderStatus?: string;
  customText?: string;
}

/**
 * Buat Click-to-Chat URL dengan pre-filled message yang di-URL-encode dengan aman.
 */
export function buildWhatsAppUrl(options?: BuildWhatsAppUrlOptions): string {
  const number = getWhatsAppNumber();
  if (!number) return '';

  let message = 'Halo Admin AD Computer, saya ingin berkonsultasi mengenai layanan komputer.';

  if (options?.customText) {
    message = options.customText;
  } else if (options?.serviceOrderId) {
    message = `Halo Admin AD Computer,

Saya ingin menanyakan Service Order saya.

Order ID: ${options.serviceOrderId}
${options.orderStatus ? `Status: ${options.orderStatus}\n` : ''}
Mohon bantuannya.`;
  } else if (options?.userProblem && options.userProblem.trim().length > 0) {
    message = `Halo Admin AD Computer,

Saya ingin berkonsultasi mengenai masalah laptop saya.

Masalah:
${options.userProblem.trim()}

Saya mendapatkan bantuan awal dari AI Assistant.

Mohon bantuannya.`;
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Deteksi apakah customer atau respon mengindikasikan kebutuhan kontak Admin via WhatsApp
 */
export function isContactAdminIntent(userQuery: string = '', assistantReply: string = ''): boolean {
  const combined = `${userQuery} ${assistantReply}`.toLowerCase();
  
  const keywords = [
    'chat admin',
    'bicara dengan admin',
    'hubungi admin',
    'kontak admin',
    'nomor admin',
    'no admin',
    'wa admin',
    'whatsapp admin',
    'customer service',
    'cs',
    'bicara dengan manusia',
    'bantuan manusia',
    'minta wa',
    'minta nomor',
    'nomor whatsapp',
    'hubungi langsung',
    'order manual',
    'pesan via wa',
    'booking via wa',
    'whatsapp',
    'wa.me',
  ];

  return keywords.some((kw) => combined.includes(kw));
}
