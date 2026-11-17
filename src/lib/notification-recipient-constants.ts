/**
 * Konstanta & tipe Konfigurasi Notifikasi (client-safe).
 *
 * File ini TIDAK mengimpor Prisma / modul server apa pun sehingga aman
 * digunakan oleh komponen client (React) maupun server (API route).
 */

export const RECIPIENT_TYPES = ['ADMIN', 'CUSTOMER', 'TECHNICIAN', 'OTHER'] as const;
export type NotificationRecipientType = (typeof RECIPIENT_TYPES)[number];

export type NotificationEvent = 'NEW_ORDER' | 'STATUS_CHANGE' | 'SERVICE_COMPLETED';

export const RECIPIENT_TYPE_LABELS: Record<NotificationRecipientType, string> = {
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
  TECHNICIAN: 'Teknisi',
  OTHER: 'Lainnya',
};

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  NEW_ORDER: 'Pesanan Baru',
  STATUS_CHANGE: 'Perubahan Status Servis',
  SERVICE_COMPLETED: 'Servis Selesai',
};

export function isNotificationRecipientType(value: unknown): value is NotificationRecipientType {
  return typeof value === 'string' && (RECIPIENT_TYPES as readonly string[]).includes(value);
}

/** Nama field boolean pada model yang mewakili sebuah event. */
export function getEventFlag(
  event: NotificationEvent
): 'notifyNewOrder' | 'notifyStatusChange' | 'notifyServiceCompleted' {
  switch (event) {
    case 'NEW_ORDER':
      return 'notifyNewOrder';
    case 'STATUS_CHANGE':
      return 'notifyStatusChange';
    case 'SERVICE_COMPLETED':
    default:
      return 'notifyServiceCompleted';
  }
}
