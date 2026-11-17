import { prisma } from '@/lib/db';
import { notifyNewOrderTelegram, notifyQuotationResponseTelegram } from '@/lib/telegram';
import { resolveRecipientsForEvent } from '@/lib/notification-recipients';
import {
  notifyQuotationResponseWhatsApp,
  sendWhatsAppMessage,
  formatNewOrderWhatsAppMessage,
  formatCustomerNewOrderMessage,
  formatCustomerStatusUpdateMessage,
  formatCustomerServiceCompletedMessage,
  formatInternalStatusUpdateMessage,
  formatInternalServiceCompletedMessage,
  isStatusCompleted,
  isDuplicateNotification,
  isWhatsAppNotifyCustomerEnabled,
  type OrderNotificationPayload,
  type QuotationResponsePayload,
  type OrderStatusNotificationPayload,
} from '@/lib/whatsapp-notification';

export type NotificationEventType =
  | 'ORDER_STATUS'
  | 'QUOTATION_READY'
  | 'PAYMENT_CONFIRMED'
  | 'SYSTEM';

/**
 * Send a single notification to one user.
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationEventType = 'SYSTEM'
) {
  return prisma.notification.create({
    data: { userId, title, message, type, isRead: false },
  });
}

/**
 * Send a notification to ALL admin users.
 */
export async function notifyAllAdmins(
  title: string,
  message: string,
  type: NotificationEventType = 'SYSTEM'
) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title,
      message,
      type,
      isRead: false,
    })),
  });
}

/**
 * Convenient event-based helpers.
 */
export const NotificationEvents = {
  /** Customer books a new service — notify admins */
  bookingReceived: (ticketNumber: string, customerName: string, deviceBrand: string, deviceModel: string) =>
    notifyAllAdmins(
      'Booking Servis Baru Diterima',
      `${customerName} mengajukan booking baru: ${deviceBrand} ${deviceModel}. Tiket: #${ticketNumber}`,
      'ORDER_STATUS'
    ),

  /** Admin changes order status — notify customer */
  orderStatusChanged: (userId: string, ticketNumber: string, newStatus: string, deviceInfo: string) =>
    sendNotification(
      userId,
      'Status Servis Diperbarui',
      `Tiket #${ticketNumber} (${deviceInfo}) telah diperbarui ke status: ${newStatus}.`,
      'ORDER_STATUS'
    ),

  /** Admin updates status to COMPLETED/DELIVERED */
  serviceCompleted: (userId: string, ticketNumber: string, deviceInfo: string) =>
    sendNotification(
      userId,
      'Servis Perangkat Selesai! 🎉',
      `Perangkat Anda (${deviceInfo}) pada tiket #${ticketNumber} telah selesai diperbaiki. Silakan hubungi kami untuk pengambilan atau pengiriman.`,
      'ORDER_STATUS'
    ),

  /** Admin submits diagnosis — notify customer */
  diagnosisCompleted: (userId: string, ticketNumber: string, deviceInfo: string) =>
    sendNotification(
      userId,
      'Hasil Diagnosa Tersedia',
      `Diagnosa teknis perangkat Anda (${deviceInfo}) pada tiket #${ticketNumber} telah selesai. Silakan cek quotation yang akan segera dikirim.`,
      'ORDER_STATUS'
    ),

  /** Admin creates/publishes quotation — notify customer */
  quotationCreated: (userId: string, ticketNumber: string, quotationNumber: string, total: number) => {
    const totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(total);
    return sendNotification(
      userId,
      'Surat Penawaran Biaya Tersedia',
      `Penawaran harga ${quotationNumber} untuk tiket #${ticketNumber} telah diterbitkan. Total: ${totalFormatted}. Silakan review dan setujui/tolak.`,
      'QUOTATION_READY'
    );
  },

  /** Customer approves quotation — notify admins */
  quotationApproved: (ticketNumber: string, customerName: string, quotationNumber: string) =>
    notifyAllAdmins(
      'Penawaran Disetujui Customer',
      `${customerName} menyetujui penawaran ${quotationNumber} untuk tiket #${ticketNumber}. Servis dapat segera dimulai.`,
      'QUOTATION_READY'
    ),

  /** Customer rejects quotation — notify admins */
  quotationRejected: (ticketNumber: string, customerName: string, quotationNumber: string) =>
    notifyAllAdmins(
      'Penawaran Ditolak Customer',
      `${customerName} menolak penawaran ${quotationNumber} untuk tiket #${ticketNumber}. Perlu tindak lanjut.`,
      'QUOTATION_READY'
    ),

  /** Admin records payment — notify customer */
  paymentRecorded: (userId: string, ticketNumber: string, amount: number, method: string, status: string) => {
    const amountFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    const statusLabel = status === 'PAID' ? 'LUNAS' : status === 'PARTIAL' ? 'Pembayaran Sebagian' : 'Dicatat';
    return sendNotification(
      userId,
      `Pembayaran ${statusLabel} Dicatat`,
      `Pembayaran sebesar ${amountFormatted} via ${method} untuk tiket #${ticketNumber} telah dicatat. Status: ${statusLabel}.`,
      'PAYMENT_CONFIRMED'
    );
  },
};

/**
 * ============================================================================
 * Multi-Channel External Notifications (Telegram & WhatsApp)
 * ============================================================================
 * Menjalankan pengiriman notifikasi ke kanal eksternal secara paralel (Promise.allSettled)
 * dan non-blocking. Kegagalan atau absennya kredensial di salah satu kanal
 * dijamin tidak akan menggagalkan atau memblokir kanal lainnya.
 */

/**
 * Kirim notifikasi pesanan servis baru ke penerima internal (Admin/Teknisi/Lainnya)
 * yang dikonfigurasi di database. Satu nomor hanya menerima satu pesan.
 */
export async function dispatchInternalNewOrderWhatsApp(order: OrderNotificationPayload) {
  const { internal } = await resolveRecipientsForEvent({
    event: 'NEW_ORDER',
    customerId: order.customerId,
    customerPhone: order.customerPhone,
  });

  if (internal.length === 0) return [];

  const text = formatNewOrderWhatsAppMessage(order);

  return Promise.allSettled(
    internal.map((recipient) => {
      const dedupKey = `NEW_ORDER_INTERNAL:${order.ticketNumber}:${recipient.phone}`;
      if (isDuplicateNotification(dedupKey)) {
        return Promise.resolve({ skipped: true, recipient: recipient.phone });
      }

      return sendWhatsAppMessage({
        to: recipient.phone,
        text,
        event: 'NEW_ORDER_INTERNAL',
        data: {
          ticketNumber: order.ticketNumber,
          recipientType: recipient.type,
        },
      }).catch((err) => {
        console.error('[MULTI-CHANNEL] Gagal kirim WhatsApp order ke', recipient.phone, err);
        return { success: false, error: String(err) };
      });
    })
  );
}

/**
 * Kirim notifikasi perubahan status / servis selesai ke penerima internal
 * (Admin/Teknisi/Lainnya) sesuai konfigurasi database.
 */
export async function dispatchInternalStatusWhatsApp(data: OrderStatusNotificationPayload) {
  const event = isStatusCompleted(data.newStatus) ? 'SERVICE_COMPLETED' : 'STATUS_CHANGE';

  const { internal } = await resolveRecipientsForEvent({
    event,
    customerId: data.customerId,
    customerPhone: data.customerPhone,
  });

  if (internal.length === 0) return [];

  const text =
    event === 'SERVICE_COMPLETED'
      ? formatInternalServiceCompletedMessage({
          ticketNumber: data.ticketNumber,
          customerName: data.customerName,
          deviceInfo: data.deviceInfo,
        })
      : formatInternalStatusUpdateMessage({
          ticketNumber: data.ticketNumber,
          customerName: data.customerName,
          deviceInfo: data.deviceInfo,
          newStatus: data.newStatus,
          adminNotes: data.adminNotes,
        });

  return Promise.allSettled(
    internal.map((recipient) => {
      const dedupKey = `${event}_INTERNAL:${data.ticketNumber}:${data.newStatus}:${recipient.phone}`;
      if (isDuplicateNotification(dedupKey)) {
        return Promise.resolve({ skipped: true, recipient: recipient.phone });
      }

      return sendWhatsAppMessage({
        to: recipient.phone,
        text,
        event: `${event}_INTERNAL`,
        data: {
          ticketNumber: data.ticketNumber,
          status: data.newStatus,
          recipientType: recipient.type,
        },
      }).catch((err) => {
        console.error('[MULTI-CHANNEL] Gagal kirim WhatsApp status ke', recipient.phone, err);
        return { success: false, error: String(err) };
      });
    })
  );
}

/**
 * Kirim notifikasi pesanan baru ke Customer pemilik pesanan dan penerima
 * bertipe CUSTOMER yang terkait dengan akun tersebut (satu pesan per nomor).
 */
export async function dispatchCustomerNewOrderWhatsApp(order: OrderNotificationPayload) {
  if (!isWhatsAppNotifyCustomerEnabled()) return [];

  const { customer } = await resolveRecipientsForEvent({
    event: 'NEW_ORDER',
    customerId: order.customerId,
    customerPhone: order.customerPhone,
  });

  if (customer.length === 0) return [];

  const deviceInfo = `${order.deviceType} — ${order.deviceBrand} ${order.deviceModel}`.trim();
  const text = formatCustomerNewOrderMessage({
    customerName: order.customerName,
    ticketNumber: order.ticketNumber,
    deviceInfo,
    problemDescription: order.problemDescription,
    orderDate: order.createdAt || new Date(),
  });

  return Promise.allSettled(
    customer.map((recipient) => {
      const dedupKey = `NEW_ORDER_CUSTOMER:${order.ticketNumber}:${recipient.phone}`;
      if (isDuplicateNotification(dedupKey)) {
        return Promise.resolve({ skipped: true, recipient: recipient.phone });
      }

      return sendWhatsAppMessage({
        to: recipient.phone,
        text,
        event: 'NEW_ORDER_CUSTOMER',
        data: {
          ticketNumber: order.ticketNumber,
          customerName: order.customerName,
          recipientType: recipient.type,
        },
      }).catch((err) => {
        console.error('[MULTI-CHANNEL] Gagal kirim WhatsApp order ke customer', recipient.phone, err);
        return { success: false, error: String(err) };
      });
    })
  );
}

/**
 * Kirim notifikasi pesanan servis baru ke Admin/Teknisi (WhatsApp) serta
 * Customer pemilik pesanan (WhatsApp) secara bersamaan, plus Telegram Admin.
 */
export async function dispatchExternalOrderAlert(order: OrderNotificationPayload) {
  return Promise.allSettled([
    // 1. Alert Telegram ke Admin (perilaku lama, tidak diubah)
    Promise.resolve().then(() => notifyNewOrderTelegram(order)).catch((err) => {
      console.error('[MULTI-CHANNEL] Error notifikasi Telegram order admin:', err);
    }),
    // 2. Alert WhatsApp ke Admin/Teknisi/Lainnya dari konfigurasi database
    dispatchInternalNewOrderWhatsApp(order).catch((err) => {
      console.error('[MULTI-CHANNEL] Error notifikasi WhatsApp internal order:', err);
    }),
    // 3. Notifikasi WhatsApp ke Customer pemilik pesanan (Event A)
    dispatchCustomerNewOrderWhatsApp(order).catch((err) => {
      console.error('[MULTI-CHANNEL] Error notifikasi WhatsApp order customer:', err);
    }),
  ]);
}

/**
 * Kirim notifikasi persetujuan/penolakan quotation oleh customer ke Admin via Telegram & WhatsApp.
 */
export async function dispatchExternalQuotationAlert(data: QuotationResponsePayload) {
  return Promise.allSettled([
    Promise.resolve().then(() => notifyQuotationResponseTelegram(data)).catch((err) => {
      console.error('[MULTI-CHANNEL] Error notifikasi Telegram quotation:', err);
    }),
    Promise.resolve().then(() => notifyQuotationResponseWhatsApp(data)).catch((err) => {
      console.error('[MULTI-CHANNEL] Error notifikasi WhatsApp quotation:', err);
    }),
  ]);
}

/**
 * Kirim notifikasi update status ke nomor WhatsApp customer (opsional jika aktif).
 */
export async function dispatchCustomerStatusWhatsApp(data: OrderStatusNotificationPayload) {
  if (!isWhatsAppNotifyCustomerEnabled()) return [];

  const event = isStatusCompleted(data.newStatus) ? 'SERVICE_COMPLETED' : 'STATUS_CHANGE';

  const { customer } = await resolveRecipientsForEvent({
    event,
    customerId: data.customerId,
    customerPhone: data.customerPhone,
  });

  if (customer.length === 0) return [];

  const text = isStatusCompleted(data.newStatus)
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

  return Promise.allSettled(
    customer.map((recipient) => {
      const dedupKey = `CUSTOMER_STATUS:${data.ticketNumber}:${data.newStatus}:${recipient.phone}`;
      if (isDuplicateNotification(dedupKey)) {
        return Promise.resolve({ skipped: true, recipient: recipient.phone });
      }

      return sendWhatsAppMessage({
        to: recipient.phone,
        text,
        event: isStatusCompleted(data.newStatus)
          ? 'CUSTOMER_ORDER_COMPLETED'
          : 'CUSTOMER_STATUS_UPDATE',
        data: {
          ticketNumber: data.ticketNumber,
          customerName: data.customerName,
          status: data.newStatus,
          recipientType: recipient.type,
        },
      }).catch((err) => {
        console.error('[MULTI-CHANNEL] Gagal kirim WhatsApp status ke customer', recipient.phone, err);
        return { success: false, error: String(err) };
      });
    })
  );
}

/**
 * Kirim notifikasi perubahan status / servis selesai ke Customer pemilik
 * pesanan DAN penerima internal (Admin/Teknisi/Lainnya) sekaligus.
 * Kegagalan salah satu kanal tidak menggagalkan proses utama website.
 */
export async function dispatchStatusNotifications(data: OrderStatusNotificationPayload) {
  return Promise.allSettled([
    dispatchCustomerStatusWhatsApp(data),
    dispatchInternalStatusWhatsApp(data).catch((err) => {
      console.error('[MULTI-CHANNEL] Error notifikasi WhatsApp internal status:', err);
    }),
  ]);
}
