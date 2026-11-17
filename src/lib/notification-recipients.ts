/**
 * Notification Recipient Service
 * IT Service Business System - AD Computer
 *
 * Mengelola daftar nomor WhatsApp penerima notifikasi otomatis yang
 * dikonfigurasi Admin melalui menu "Konfigurasi Notifikasi".
 *
 * Prinsip:
 * - Pengirim tetap memakai Device Admin Fonnte yang sudah terhubung
 *   (WHATSAPP_API_TOKEN di environment) — TIDAK membuat device baru.
 * - Nomor penerima diambil dari database.
 * - Customer hanya menerima notifikasi untuk pesanan miliknya sendiri.
 * - Satu nomor hanya menerima satu pesan per event (deduplikasi nomor).
 */

import { prisma } from '@/lib/db';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import {
  getAdminWhatsAppRecipient,
  isValidWhatsAppNumber,
} from '@/lib/whatsapp-notification';
import {
  getEventFlag,
  isNotificationRecipientType,
  type NotificationEvent,
  type NotificationRecipientType,
} from '@/lib/notification-recipient-constants';

// Re-export agar modul server tetap bisa mengimpor dari satu tempat.
export {
  RECIPIENT_TYPES,
  RECIPIENT_TYPE_LABELS,
  NOTIFICATION_EVENT_LABELS,
  isNotificationRecipientType,
  getEventFlag,
} from '@/lib/notification-recipient-constants';
export type {
  NotificationRecipientType,
  NotificationEvent,
} from '@/lib/notification-recipient-constants';

/** Normalisasi nomor WhatsApp ke format internasional tanpa simbol (628...). */
export function normalizeRecipientPhone(phone?: string | null): string {
  return formatWhatsAppNumber(phone);
}

/** Validasi nomor WhatsApp (10-16 digit setelah normalisasi). */
export function isValidRecipientPhone(phone?: string | null): boolean {
  return isValidWhatsAppNumber(normalizeRecipientPhone(phone));
}

export interface ResolvedRecipient {
  phone: string;
  name: string;
  type: NotificationRecipientType;
  source: 'database' | 'customer' | 'env-admin';
  /** true jika nomor ini adalah pemilik pesanan (menerima template Customer). */
  isCustomerOwner: boolean;
}

export interface ResolveRecipientsParams {
  event: NotificationEvent;
  customerId?: string | null;
  customerPhone?: string | null;
}

export interface ResolvedRecipientSet {
  all: ResolvedRecipient[];
  customer: ResolvedRecipient[];
  internal: ResolvedRecipient[];
}

/**
 * Ambil penerima aktif yang mengaktifkan event tertentu dari database.
 */
export async function getActiveRecipientsForEvent(event: NotificationEvent) {
  const flag = getEventFlag(event);
  return prisma.notificationRecipient.findMany({
    where: { isActive: true, [flag]: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Pastikan konfigurasi awal tetap kompatibel dengan perilaku lama:
 * jika tabel masih kosong, buat satu penerima Admin dari
 * WHATSAPP_ADMIN_RECIPIENT (nomor real, bukan data dummy).
 */
export async function ensureDefaultAdminRecipient() {
  const total = await prisma.notificationRecipient.count();
  if (total > 0) return null;

  const adminPhone = normalizeRecipientPhone(getAdminWhatsAppRecipient());
  if (!isValidWhatsAppNumber(adminPhone)) return null;

  return prisma.notificationRecipient.create({
    data: {
      name: 'Admin AD Computer',
      phone: adminPhone,
      recipientType: 'ADMIN',
      notifyNewOrder: true,
      notifyStatusChange: true,
      notifyServiceCompleted: true,
      isActive: true,
      notes: 'Dibuat otomatis dari konfigurasi WHATSAPP_ADMIN_RECIPIENT.',
    },
  });
}

/**
 * Susun daftar penerima final untuk sebuah event.
 *
 * Aturan:
 * - Pemilik pesanan (customer) selalu menjadi penerima template Customer.
 * - Penerima bertipe CUSTOMER dari database hanya ikut bila terhubung ke
 *   pemilik pesanan (userId sama) atau nomornya sama dengan nomor pemilik.
 * - Nomor yang sama tidak dikirim dua kali.
 * - Bila tabel konfigurasi masih kosong, gunakan nomor admin dari environment
 *   agar perilaku notifikasi lama tetap berjalan.
 */
export async function resolveRecipientsForEvent(
  params: ResolveRecipientsParams
): Promise<ResolvedRecipientSet> {
  const { event, customerId, customerPhone } = params;
  const map = new Map<string, ResolvedRecipient>();

  const ownerPhone = normalizeRecipientPhone(customerPhone);
  const hasOwnerPhone = isValidWhatsAppNumber(ownerPhone);

  // 1. Pemilik pesanan — selalu menerima notifikasi terkait pesanannya sendiri.
  if (hasOwnerPhone) {
    map.set(ownerPhone, {
      phone: ownerPhone,
      name: 'Customer Pemilik Pesanan',
      type: 'CUSTOMER',
      source: 'customer',
      isCustomerOwner: true,
    });
  }

  // 2. Penerima terkonfigurasi di database.
  const rows = await getActiveRecipientsForEvent(event);
  for (const row of rows) {
    const phone = normalizeRecipientPhone(row.phone);
    if (!isValidWhatsAppNumber(phone)) continue;

    const type = isNotificationRecipientType(row.recipientType)
      ? row.recipientType
      : 'OTHER';

    if (type === 'CUSTOMER') {
      const belongsToOwner =
        (Boolean(row.userId) && Boolean(customerId) && row.userId === customerId) ||
        (hasOwnerPhone && phone === ownerPhone);
      // Customer tidak boleh menerima notifikasi pesanan orang lain.
      if (!belongsToOwner) continue;
      // Jika nomor pemilik sudah ada, cukup satu pesan (template Customer).
      if (map.has(phone)) continue;
      map.set(phone, {
        phone,
        name: row.name,
        type,
        source: 'database',
        isCustomerOwner: true,
      });
      continue;
    }

    if (map.has(phone)) continue;
    map.set(phone, {
      phone,
      name: row.name,
      type,
      source: 'database',
      isCustomerOwner: false,
    });
  }

  // 3. Fallback kompatibilitas: hanya jika belum ada konfigurasi sama sekali.
  if (rows.length === 0) {
    const totalConfigured = await prisma.notificationRecipient.count();
    if (totalConfigured === 0) {
      const envAdmin = normalizeRecipientPhone(getAdminWhatsAppRecipient());
      if (isValidWhatsAppNumber(envAdmin) && !map.has(envAdmin)) {
        map.set(envAdmin, {
          phone: envAdmin,
          name: 'Admin AD Computer',
          type: 'ADMIN',
          source: 'env-admin',
          isCustomerOwner: false,
        });
      }
    }
  }

  const all = Array.from(map.values());
  return {
    all,
    customer: all.filter((r) => r.isCustomerOwner),
    internal: all.filter((r) => !r.isCustomerOwner),
  };
}

// ============================================================================
// VALIDASI INPUT KONFIGURASI
// ============================================================================

export interface RecipientInputPayload {
  name: string;
  phone: string;
  recipientType: NotificationRecipientType;
  userId: string | null;
  notifyNewOrder: boolean;
  notifyStatusChange: boolean;
  notifyServiceCompleted: boolean;
  isActive: boolean;
  notes: string | null;
}

export interface ParseRecipientResult {
  ok: boolean;
  errors: string[];
  data: Partial<RecipientInputPayload>;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

/**
 * Validasi & normalisasi body request penerima notifikasi.
 * mode "create": semua field wajib/default terisi.
 * mode "update": hanya field yang dikirim yang divalidasi.
 */
export function parseRecipientInput(body: any, mode: 'create' | 'update'): ParseRecipientResult {
  const errors: string[] = [];
  const data: Partial<RecipientInputPayload> = {};

  if (!body || typeof body !== 'object') {
    return { ok: false, errors: ['Format data tidak valid.'], data: {} };
  }

  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  // name
  if (mode === 'create' || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      errors.push('Nama penerima wajib diisi (minimal 2 karakter).');
    } else if (name.length > 100) {
      errors.push('Nama penerima maksimal 100 karakter.');
    } else {
      data.name = name;
    }
  }

  // phone
  if (mode === 'create' || has('phone')) {
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!rawPhone) {
      errors.push('Nomor WhatsApp wajib diisi.');
    } else if (!isValidRecipientPhone(rawPhone)) {
      errors.push('Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx (10-16 digit).');
    } else {
      data.phone = normalizeRecipientPhone(rawPhone);
    }
  }

  // recipientType
  if (mode === 'create' || has('recipientType')) {
    const type = typeof body.recipientType === 'string' ? body.recipientType.toUpperCase().trim() : 'ADMIN';
    if (!isNotificationRecipientType(type)) {
      errors.push('Jenis penerima tidak valid (ADMIN, CUSTOMER, TECHNICIAN, OTHER).');
    } else {
      data.recipientType = type;
    }
  }

  // userId (opsional, hanya untuk tipe CUSTOMER)
  if (has('userId')) {
    if (body.userId === null || body.userId === '') {
      data.userId = null;
    } else if (typeof body.userId === 'string') {
      data.userId = body.userId.trim();
    } else {
      errors.push('ID akun customer tidak valid.');
    }
  } else if (mode === 'create') {
    data.userId = null;
  }

  // boolean flags
  if (mode === 'create' || has('notifyNewOrder')) {
    data.notifyNewOrder = toBoolean(body.notifyNewOrder, true);
  }
  if (mode === 'create' || has('notifyStatusChange')) {
    data.notifyStatusChange = toBoolean(body.notifyStatusChange, true);
  }
  if (mode === 'create' || has('notifyServiceCompleted')) {
    data.notifyServiceCompleted = toBoolean(body.notifyServiceCompleted, true);
  }
  if (mode === 'create' || has('isActive')) {
    data.isActive = toBoolean(body.isActive, true);
  }

  // notes
  if (has('notes')) {
    if (body.notes === null || body.notes === '') {
      data.notes = null;
    } else if (typeof body.notes === 'string') {
      const notes = body.notes.trim();
      if (notes.length > 300) {
        errors.push('Catatan maksimal 300 karakter.');
      } else {
        data.notes = notes || null;
      }
    } else {
      errors.push('Catatan tidak valid.');
    }
  } else if (mode === 'create') {
    data.notes = null;
  }

  // Customer recipient wajib terhubung ke akun customer agar aman.
  if (data.recipientType === 'CUSTOMER' && !data.userId) {
    errors.push('Penerima bertipe Customer wajib dikaitkan dengan akun customer terdaftar.');
  }
  // userId hanya relevan untuk tipe CUSTOMER.
  if (data.recipientType && data.recipientType !== 'CUSTOMER' && data.userId) {
    data.userId = null;
  }

  return { ok: errors.length === 0, errors, data };
}

