import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@/lib/config';
import { isContactAdminIntent } from '@/lib/whatsapp';

export interface UserSessionContext {
  userId: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN' | 'TECHNICIAN';
}

export interface DatabaseQueryResult {
  contextText: string;
  directAnswer?: string;
  showWhatsApp: boolean;
  userProblem?: string;
  forbiddenTicket?: string;
  notFoundTicket?: string;
}

// Terjemahan status teknis ke Bahasa Indonesia yang ramah pelanggan
export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu Konfirmasi',
  SUBMITTED: 'Diajukan',
  DIAGNOSING: 'Sedang Didianosa / Pengecekan',
  QUOTED: 'Estimasi Biaya Siap (Menunggu Persetujuan)',
  IN_REPAIR: 'Sedang Dikerjakan / Dalam Perbaikan',
  READY_FOR_PICKUP: 'Selesai & Siap Diambil',
  COMPLETED: 'Selesai (Sudah Diambil)',
  CANCELLED: 'Dibatalkan',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Belum Dibayar',
  PENDING_VERIFICATION: 'Menunggu Verifikasi Pembayaran',
  PAID: 'Lunas',
  REFUNDED: 'Dana Dikembalikan (Refund)',
};

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function formatDateIndo(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DIREKTORI CUSTOMER (KHUSUS ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
// Semua query di bawah ini hanya dipanggil dari getAdminDatabaseContext(),
// yang hanya digunakan oleh endpoint /api/admin/chatbot setelah role ADMIN
// diverifikasi dari JWT. Jangan panggil dari konteks Customer/Guest.

const CUSTOMER_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  _count: { select: { serviceOrders: true } },
  serviceOrders: {
    select: { ticketNumber: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} as const;

type CustomerDirectoryRow = {
  id: string;
  name: string;
  createdAt: Date;
  _count: { serviceOrders: number };
  serviceOrders: Array<{ ticketNumber: string; status: string; createdAt: Date }>;
};

const CUSTOMER_SEARCH_STOPWORDS = new Set([
  'terbaru', 'baru', 'semua', 'seluruh', 'kita', 'yang', 'di', 'adalah',
  'berapa', 'jumlah', 'total', 'data', 'daftar', 'list', 'berdasarkan',
  'nama', 'pelanggan', 'customer', 'service', 'servis', 'order', 'pesanan',
  'transaksi', 'terdaftar', 'mendaftar',
]);

/** Apakah pertanyaan membahas customer/pelanggan? */
export function isCustomerRelatedQuery(q: string): boolean {
  if (/customer\s+service/.test(q) && !/(daftar|nama|data|semua|seluruh)\s+customer/.test(q)) {
    return false;
  }
  return /(customer|pelanggan)/.test(q);
}

/**
 * Deteksi permintaan data customer/pengguna lain yang HARUS ditolak
 * untuk Customer & Guest. Dipakai sebelum AI dipanggil, sehingga tidak
 * bergantung pada kepatuhan model terhadap prompt.
 */
export function isOtherCustomerDataQuery(q: string): boolean {
  // "customer service" adalah istilah layanan pelanggan, bukan permintaan data.
  if (/customer\s+service/.test(q) && !/(daftar|nama|data|semua|seluruh)\s+customer/.test(q)) {
    return false;
  }

  const mentionsCustomer = /(customer|pelanggan)/.test(q);

  if (!mentionsCustomer) {
    return (
      /(\bdaftar\b|\blist\b|semua|seluruh|data|nama)\s+(user|akun|pengguna)/.test(q) ||
      /(berapa|jumlah|total|banyak)\s+(user|akun|pengguna|admin|teknisi|technician)/.test(q) ||
      /(siapa|daftar|data|semua)\s+(admin|teknisi|technician|user|akun|pengguna)/.test(q)
    );
  }

  return (
    /(\bdaftar\b|\blist\b|semua|seluruh|nama|data)\s+(customer|pelanggan)/.test(q) ||
    /(customer|pelanggan)\s+(kita|lain|lainnya|terdaftar|terbaru|baru|bernama)/.test(q) ||
    /(customer|pelanggan)\s+yang\s+(baru|pernah|sudah|belum|memiliki|punya|terdaftar|service|servis|order|pesanan|transaksi)/.test(q) ||
    /(customer|pelanggan)\s+mana\s+(yang|yg)/.test(q) ||
    /(customer|pelanggan)\s+(dengan|yang)\s+.*(terbanyak|paling banyak|paling sering|tertinggi)/.test(q) ||
    /siapa\s+saja.*(customer|pelanggan)/.test(q) ||
    /(jumlah|total|berapa|banyak)\s+(customer|pelanggan)/.test(q) ||
    /cari\s+(customer|pelanggan)/.test(q) ||
    /riwayat\s+(customer|pelanggan)/.test(q) ||
    /(service|servis|order|pesanan|transaksi)\s+(customer|pelanggan)/.test(q)
  );
}

/** Ekstrak nama customer dari pertanyaan pencarian. */
function extractCustomerSearchTerm(userQuery: string): string | null {
  const patterns = [
    /(?:cari|carikan|temukan|search)\s+(?:customer|pelanggan)\s+(?:bernama\s+|dengan\s+nama\s+|nama\s+)?([A-Za-zÀ-ÿ0-9.'\-\s]{2,60})/i,
    /(?:customer|pelanggan)\s+(?:bernama|dengan\s+nama)\s+([A-Za-zÀ-ÿ0-9.'\-\s]{2,60})/i,
  ];

  for (const pattern of patterns) {
    const match = userQuery.match(pattern);
    if (!match) continue;

    let term = match[1].replace(/[?.!,;:]+$/g, '').trim();
    term = term.split(/\s+(yang|di|dengan|dari|dan|atau)\s+/i)[0].trim();
    if (!term) continue;

    const normalized = term.toLowerCase();
    if (CUSTOMER_SEARCH_STOPWORDS.has(normalized)) continue;
    if (normalized.includes('berdasarkan') || normalized.includes('nama customer') || normalized.includes('customer')) continue;

    return term.slice(0, 60);
  }

  return null;
}

function formatCustomerLine(customer: CustomerDirectoryRow, index: number): string {
  const totalOrders = customer._count.serviceOrders;
  const lastOrder = customer.serviceOrders[0];
  const serviceInfo =
    totalOrders === 0
      ? 'belum pernah servis'
      : `${totalOrders} servis • terakhir: ${STATUS_LABELS[lastOrder.status] || lastOrder.status}`;

  return `${index}. **${customer.name}** — terdaftar ${formatDateIndo(customer.createdAt)} • ${serviceInfo}`;
}

function formatCustomerListAnswer(
  heading: string,
  rows: CustomerDirectoryRow[],
  total: number
): string {
  if (total === 0) {
    return 'Belum ada customer yang terdaftar di database AD Computer saat ini.';
  }

  const lines = rows.map((customer, index) => formatCustomerLine(customer, index + 1)).join('\n');
  const shown =
    rows.length < total
      ? `\n\nMenampilkan ${rows.length} customer terbaru dari total **${total} customer**.`
      : '';

  return `${heading}\n\n${lines}${shown}\n\nTotal customer: **${total} orang**.`;
}

/**
 * Jawaban langsung untuk pertanyaan customer (Admin only).
 * Mengembalikan null jika pertanyaan bukan tentang customer.
 */
async function buildAdminCustomerAnswer(
  userQuery: string
): Promise<{ directAnswer: string; contextText: string } | null> {
  const q = userQuery.toLowerCase();
  if (!/(customer|pelanggan)/.test(q)) return null;

  const countWords = /(berapa|jumlah|total|banyak)/.test(q);
  const listWords =
    /\b(daftar|list)\s+(customer|pelanggan)/.test(q) ||
    /(tampilkan|tunjukkan|sebutkan|lihat)\s+.*(customer|pelanggan)/.test(q) ||
    /siapa\s+saja.*(customer|pelanggan)/.test(q) ||
    /(semua|seluruh)\s+(customer|pelanggan)/.test(q) ||
    /(customer|pelanggan)\s+kita/.test(q) ||
    /nama[-\s]?nama\s+(customer|pelanggan)/.test(q) ||
    /data\s+(customer|pelanggan)/.test(q);

  const searchTerm = extractCustomerSearchTerm(userQuery);
  const asksSearch =
    /(cari|carikan|temukan|search)\s+(customer|pelanggan)/.test(q) ||
    /(customer|pelanggan)\s+(bernama|dengan\s+nama)/.test(q);

  // 1. Pencarian berdasarkan nama (paling spesifik)
  if (searchTerm) {
    const term = searchTerm.replace(/[%_]/g, '').trim();
    if (!term) {
      return {
        directAnswer: 'Sebutkan nama customer yang ingin dicari, contoh: "Cari customer bernama Budi".',
        contextText: 'Admin meminta pencarian customer tanpa nama yang valid.',
      };
    }

    const matches = await prisma.user.findMany({
      where: { role: 'CUSTOMER', name: { contains: term } },
      select: CUSTOMER_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (matches.length === 0) {
      const total = await prisma.user.count({ where: { role: 'CUSTOMER' } });
      return {
        directAnswer:
          total === 0
            ? 'Belum ada customer yang terdaftar di database AD Computer saat ini.'
            : `Tidak ditemukan customer dengan nama **${term}** di database AD Computer. Pastikan ejaan nama sudah benar.`,
        contextText: `Pencarian customer dengan nama "${term}" tidak menemukan hasil.`,
      };
    }

    const lines = matches
      .map((customer, index) => formatCustomerLine(customer as CustomerDirectoryRow, index + 1))
      .join('\n');
    const limitNote =
      matches.length === 10 ? '\n\n*Menampilkan maksimal 10 hasil pencarian.*' : '';

    return {
      directAnswer: `Hasil pencarian customer dengan nama **${term}**:\n\n${lines}${limitNote}\n\nDitemukan **${matches.length} customer** yang cocok.`,
      contextText: `[HASIL PENCARIAN CUSTOMER]\nKata kunci: ${term}\n${lines}`,
    };
  }

  if (asksSearch) {
    return {
      directAnswer:
        'Tentu. Sebutkan nama customer yang ingin dicari, contoh: "Cari customer bernama Budi".',
      contextText: 'Admin meminta pencarian customer tetapi belum menyebutkan nama.',
    };
  }

  // 2. Customer terbaru
  if (
    /(terbaru|baru mendaftar|paling baru|terakhir mendaftar|baru terdaftar)/.test(q) ||
    /(customer|pelanggan)\s+baru/.test(q)
  ) {
    const wantsList = /(\bdaftar\b|\blist\b|siapa saja|semua|seluruh|tampilkan)/.test(q);
    const [total, rows] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: CUSTOMER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: wantsList ? 5 : 1,
      }),
    ]);

    if (total === 0 || rows.length === 0) {
      return {
        directAnswer: 'Belum ada customer yang terdaftar di database AD Computer saat ini.',
        contextText: 'Database customer kosong.',
      };
    }

    if (!wantsList) {
      const latest = rows[0] as CustomerDirectoryRow;
      const totalOrders = latest._count.serviceOrders;
      const serviceInfo =
        totalOrders === 0
          ? 'belum pernah servis'
          : `${totalOrders} servis • terakhir: ${STATUS_LABELS[latest.serviceOrders[0].status] || latest.serviceOrders[0].status}`;

      return {
        directAnswer: `Customer terbaru adalah **${latest.name}**, terdaftar pada **${formatDateIndo(latest.createdAt)}** (${serviceInfo}).`,
        contextText: `[CUSTOMER TERBARU]\nNama: ${latest.name}\nTerdaftar: ${formatDateIndo(latest.createdAt)}\nTotal servis: ${totalOrders}`,
      };
    }

    const lines = rows
      .map((customer, index) => formatCustomerLine(customer as CustomerDirectoryRow, index + 1))
      .join('\n');
    return {
      directAnswer: `Berikut **${rows.length} customer terbaru** yang terdaftar di AD Computer:\n\n${lines}\n\nTotal customer: **${total} orang**.`,
      contextText: `[CUSTOMER TERBARU]\n${lines}\nTotal customer: ${total}`,
    };
  }

  // 3. Customer yang belum pernah servis (harus dicek sebelum "pernah servis")
  if (/(belum pernah|belum ada|tanpa)\s+(service|servis|order|pesanan|transaksi)/.test(q)) {
    const where = { role: 'CUSTOMER', serviceOrders: { none: {} } };
    const [total, totalAll, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.findMany({
        where,
        select: CUSTOMER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (totalAll === 0) {
      return {
        directAnswer: 'Belum ada customer yang terdaftar di database AD Computer saat ini.',
        contextText: 'Database customer kosong.',
      };
    }

    if (total === 0) {
      return {
        directAnswer: 'Semua customer yang terdaftar sudah pernah melakukan service.',
        contextText: 'Tidak ada customer tanpa riwayat servis.',
      };
    }

    const lines = rows
      .map((customer, index) => formatCustomerLine(customer as CustomerDirectoryRow, index + 1))
      .join('\n');
    return {
      directAnswer: `Berikut customer yang **belum pernah melakukan service** (${total} orang):\n\n${lines}`,
      contextText: `[CUSTOMER TANPA RIWAYAT SERVIS]\n${lines}\nTotal: ${total}`,
    };
  }

  // 4. Customer dengan servis/order terbanyak
  if (
    /(terbanyak|paling banyak|paling sering|tertinggi|terloyal|top)/.test(q) &&
    /(service|servis|order|pesanan|transaksi)/.test(q)
  ) {
    const [totalAll, totalWithService, rows] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'CUSTOMER', serviceOrders: { some: {} } } }),
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: { select: { serviceOrders: true } },
        },
        take: 200,
      }),
    ]);

    if (totalAll === 0) {
      return {
        directAnswer: 'Belum ada customer yang terdaftar di database AD Computer saat ini.',
        contextText: 'Database customer kosong.',
      };
    }

    const top = rows
      .filter((row) => row._count.serviceOrders > 0)
      .sort((a, b) => b._count.serviceOrders - a._count.serviceOrders)
      .slice(0, 5);

    if (top.length === 0) {
      return {
        directAnswer: 'Belum ada customer yang memiliki riwayat service di database AD Computer.',
        contextText: 'Tidak ada customer dengan riwayat servis.',
      };
    }

    const lines = top
      .map((row, index) => `${index + 1}. **${row.name}** — ${row._count.serviceOrders} servis`)
      .join('\n');
    return {
      directAnswer: `Berikut customer dengan jumlah service terbanyak:\n\n${lines}\n\nDari total **${totalWithService} customer** yang pernah melakukan service.`,
      contextText: `[CUSTOMER DENGAN SERVIS TERBANYAK]\n${lines}\nTotal customer dengan servis: ${totalWithService}`,
    };
  }

  // 5. Customer yang pernah melakukan service
  if (
    /(pernah|sudah|riwayat|melakukan|memiliki|punya)\s+(service|servis|order|pesanan|transaksi)/.test(q) ||
    /(customer|pelanggan)\s+yang\s+(pernah|sudah|memiliki|punya|service|servis|order|pesanan|transaksi)/.test(q)
  ) {
    const where = { role: 'CUSTOMER', serviceOrders: { some: {} } };
    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: CUSTOMER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (total === 0) {
      return {
        directAnswer: 'Belum ada customer yang pernah melakukan service di database AD Computer.',
        contextText: 'Tidak ada customer dengan riwayat servis.',
      };
    }

    const lines = rows
      .map((customer, index) => formatCustomerLine(customer as CustomerDirectoryRow, index + 1))
      .join('\n');
    return {
      directAnswer: `Berikut customer yang pernah melakukan service (${total} orang):\n\n${lines}`,
      contextText: `[CUSTOMER DENGAN RIWAYAT SERVIS]\n${lines}\nTotal: ${total}`,
    };
  }

  // 6. Jumlah customer
  if (countWords && !/(admin|user|akun|role)/.test(q)) {
    const total = await prisma.user.count({ where: { role: 'CUSTOMER' } });
    return {
      directAnswer:
        total === 0
          ? 'Belum ada customer yang terdaftar di database AD Computer saat ini.'
          : `Saat ini terdapat **${total} customer** yang terdaftar di AD Computer.`,
      contextText: `[JUMLAH CUSTOMER]\nTotal customer: ${total}`,
    };
  }

  // 7. Daftar customer
  if (listWords && !countWords) {
    const [total, rows] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: CUSTOMER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      directAnswer: formatCustomerListAnswer(
        'Berikut daftar customer yang terdaftar di AD Computer:',
        rows as CustomerDirectoryRow[],
        total
      ),
      contextText: `[DAFTAR CUSTOMER]\nTotal customer: ${total}`,
    };
  }

  return null;
}

// Deteksi kata kunci pencarian
export function extractTicketNumber(text: string): string | null {
  const match = text.match(/SRV[-\s]?\d{4}[-\s]?\w+/i) || text.match(/SRV[-\s]?\w+/i);
  if (!match) return null;
  return match[0].toUpperCase().replace(/\s+/g, '-');
}

export function isServicesQuery(q: string): boolean {
  // Only match if clearly asking about services/prices — not generic repair symptom descriptions
  const priceWords = ['harga', 'tarif', 'biaya servis', 'biaya perbaikan', 'estimasi biaya', 'berapa biaya', 'berapa harga'];
  const catalogWords = ['layanan apa', 'daftar layanan', 'katalog', 'list layanan', 'jenis servis', 'jenis layanan', 'apa saja layanan', 'upgrade ssd', 'upgrade ram', 'install os', 'install windows', 'reinstall', 'jasa'];
  return [...priceWords, ...catalogWords].some(w => q.includes(w));
}

export function isOrdersQuery(q: string): boolean {
  // Must be clearly asking about their own service order / repair status — not general tech questions
  const strongWords = ['order saya', 'pesanan saya', 'servis saya', 'service saya', 'tiket servis', 'nomor tiket', 'cek tiket', 'lacak servis', 'status servis saya', 'sudah selesai belum', 'sudah jadi belum', 'pengerjaan saya', 'proses servis', 'srv-'];
  const hasStrongWord = strongWords.some(w => q.includes(w));
  // Also match if 'order' appears with 'status' or 'cek'
  const hasOrderContext = (q.includes('order') || q.includes('pesanan')) && (q.includes('status') || q.includes('cek') || q.includes('lihat'));
  return hasStrongWord || hasOrderContext;
}

export function isPaymentsQuery(q: string): boolean {
  const words = ['bayar', 'pembayaran', 'lunas', 'tagihan', 'invoice', 'transfer', 'qris', 'rekening', 'riwayat bayar', 'sudah bayar', 'bukti bayar', 'konfirmasi bayar', 'biaya servis saya'];
  return words.some(w => q.includes(w));
}

export function isKnowledgeBaseQuery(q: string): boolean {
  const words = ['garansi', 'syarat', 'ketentuan', 'kebijakan', 'jam buka', 'jam kerja', 'operasional', 'lokasi', 'alamat', 'faq', 'sop'];
  return words.some(w => q.includes(w));
}

/**
 * Deteksi pertanyaan terkait identitas pengguna yang sedang login.
 * Contoh: "siapa saya?", "apa nama saya?", "email saya apa?", dst.
 */
export function isIdentityQuery(q: string): boolean {
  // Pertanyaan tentang identitas ASSISTANT/AI bukan identitas pengguna.
  if (isAssistantIdentityQuery(q)) return false;

  const keywords = [
    // Langsung tanya identitas pengguna
    'siapa saya', 'siapa aku', 'saya siapa', 'aku siapa',
    // Tanya nama pengguna
    'nama saya', 'nama aku', 'apa namaku', 'apa nama saya',
    // Tanya email pengguna
    'email saya', 'email aku', 'apa email saya', 'emailku apa',
    // Tanya role/jabatan pengguna
    'role saya', 'role aku', 'apa role saya', 'jabatan saya', 'jabatan aku',
    'saya admin', 'saya customer', 'saya login sebagai',
    'login sebagai siapa', 'saya masuk sebagai',
    // Tanya info akun
    'akun saya', 'akun aku', 'info akun saya', 'profil saya', 'profil aku',
    'data saya', 'data akun saya', 'informasi akun saya', 'informasi saya',
    'identitas saya', 'identitas aku',
    // Variasi sehari-hari
    'kamu tau siapa aku', 'kamu kenal aku', 'kenalkan aku',
    'nomor hp saya', 'nomor telepon saya', 'telepon saya',
  ];
  return keywords.some(kw => q.includes(kw));
}

/**
 * Deteksi pertanyaan tentang identitas AI/assistant (bukan pengguna).
 * Contoh: "siapa kamu?", "nama kamu siapa?", "kamu bot apa?"
 */
export function isAssistantIdentityQuery(q: string): boolean {
  const keywords = [
    'siapa kamu', 'siapa anda', 'kamu siapa', 'anda siapa',
    'nama kamu', 'namamu', 'nama anda', 'kamu ini apa', 'kamu bot',
    'kamu ai apa', 'apakah kamu ai', 'apakah kamu bot', 'kamu manusia',
    'kamu asisten apa', 'assistant apa kamu', 'perkenalkan dirimu',
    'kenalkan dirimu', 'siapakah kamu', 'tentang kamu', 'profil kamu',
  ];
  return keywords.some(kw => q.includes(kw));
}

/**
 * Ambil profil lengkap user dari database secara aman.
 * TIDAK mengambil password, token, atau field sensitif.
 */
export async function getUserFullProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      role: true,
      createdAt: true,
      // password TIDAK diambil — keamanan
    },
  });
}

/**
 * Susun jawaban profil yang ramah untuk Customer.
 */
function buildCustomerProfileAnswer(profile: {
  id: string; name: string; email: string;
  phone: string | null; address: string | null;
  role: string; createdAt: Date;
}): string {
  const roleLabel = profile.role === 'ADMIN' ? 'Admin' : profile.role === 'TECHNICIAN' ? 'Teknisi' : 'Customer';
  return `Tentu! Berikut informasi akun Anda yang sedang login di sistem **AD Computer**:

👤 **Nama**: ${profile.name}
📧 **Email**: ${profile.email}
📱 **Nomor HP**: ${profile.phone || 'Belum diisi'}
🏠 **Alamat**: ${profile.address || 'Belum diisi'}
🔰 **Role / Hak Akses**: ${roleLabel}
🗓️ **Akun Terdaftar Sejak**: ${formatDateIndo(profile.createdAt)}

Jika ada data yang ingin diperbarui, silakan kunjungi halaman **Profil** pada menu akun Anda.`;
}

/**
 * Susun jawaban profil yang ramah untuk Admin.
 */
function buildAdminProfileAnswer(profile: {
  id: string; name: string; email: string;
  phone: string | null; address: string | null;
  role: string; createdAt: Date;
}): string {
  const roleLabel = profile.role === 'ADMIN' ? 'Admin' : profile.role === 'TECHNICIAN' ? 'Teknisi' : 'Customer';
  return `Anda sedang login sebagai **${roleLabel} AD Computer**. Berikut data akun Anda:

👤 **Nama**: ${profile.name}
📧 **Email**: ${profile.email}
📱 **Nomor HP**: ${profile.phone || 'Belum diisi'}
🏠 **Alamat**: ${profile.address || 'Belum diisi'}
🔰 **Role**: ${roleLabel}
🗓️ **Akun Terdaftar**: ${formatDateIndo(profile.createdAt)}

Sebagai ${roleLabel}, Anda memiliki akses penuh ke panel manajemen, data customer, dan laporan sistem.`;
}

/**
 * Mengambil data kontekstual yang aman untuk Customer (atau Guest)
 */
export async function getCustomerDatabaseContext(
  session: UserSessionContext | null,
  userQuery: string
): Promise<DatabaseQueryResult> {
  const q = userQuery.toLowerCase();
  const ticketNum = extractTicketNumber(userQuery);
  const showWhatsApp = isContactAdminIntent(q, '');

  let contextParts: string[] = [];
  let directAnswer: string | undefined = undefined;

  // ── PRIORITAS -1: PERTANYAAN IDENTITAS AI CHATBOT ────────────────────────
  if (isAssistantIdentityQuery(q)) {
    return {
      contextText: 'Pertanyaan tentang identitas resmi AI Assistant AD Computer.',
      directAnswer:
        'Saya adalah AI Assistant AD Computer, asisten virtual resmi AD Computer yang siap membantu Anda mendapatkan informasi layanan servis komputer dan laptop, informasi pesanan, serta bantuan lainnya.\n\n' +
        'Ada yang bisa saya bantu hari ini seputar servis komputer atau laptop Anda?',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // ── PRIORITAS 0: PERTANYAAN IDENTITAS PENGGUNA ──────────────────────────
  if (isIdentityQuery(q)) {
    if (!session) {
      return {
        contextText: 'Pengguna belum login, identitas tidak tersedia.',
        directAnswer:
          'Untuk mengetahui informasi akun Anda, silakan **login** terlebih dahulu. ' +
          'Jika belum memiliki akun, Anda dapat mendaftar melalui halaman registrasi.',
        showWhatsApp: false,
        userProblem: userQuery,
      };
    }
    // Ambil profil lengkap dari DB — bukan dari token saja
    const profile = await getUserFullProfile(session.userId);
    if (!profile) {
      return {
        contextText: `Profil user ${session.userId} tidak ditemukan di database.`,
        directAnswer:
          'Maaf, profil akun Anda tidak dapat ditemukan dalam database. ' +
          'Kemungkinan akun telah dihapus. Silakan hubungi Admin kami untuk bantuan.',
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }
    return {
      contextText: `[PROFIL CUSTOMER TERVERIFIKASI]\nNama: ${profile.name}\nEmail: ${profile.email}\nRole: ${profile.role}`,
      directAnswer: buildCustomerProfileAnswer(profile),
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // ── PRIVASI & KEAMANAN: CUSTOMER/GUEST TIDAK BOLEH MELIHAT DATA PENGGUNA LAIN
  if (isOtherCustomerDataQuery(q)) {
    return {
      contextText:
        'Pertanyaan tentang daftar/statistik customer atau data pengguna lain oleh Customer/Guest. Akses dibatasi demi privasi.',
      directAnswer:
        'Mohon maaf, informasi daftar customer, jumlah customer, dan data pengguna lain bersifat internal dan hanya dapat diakses oleh Administrator. ' +
        'Anda hanya dapat melihat profil serta riwayat servis milik akun Anda sendiri.',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // Pertanyaan customer tentang jenis role yang tersedia di website
  if (
    q.includes('jenis role') ||
    q.includes('macam role') ||
    q.includes('apa saja role') ||
    q.includes('role apa saja') ||
    q.includes('role yang tersedia')
  ) {
    return {
      contextText: 'Pertanyaan tentang jenis role oleh customer.',
      directAnswer:
        'Website **AD Computer** memiliki 3 jenis role:\n' +
        '1. **Admin**: Bertugas mengelola website dan pesanan servis.\n' +
        '2. **Customer**: Menggunakan layanan website untuk booking servis, konsultasi, dan pembayaran.\n' +
        '3. **AI Assistant**: Asisten virtual yang membantu menjawab pertanyaan dan memberikan informasi secara otomatis.',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // ── PERTANYAAN KHUSUS SEPUTAR LAYANAN & PERBAIKAN KOMPUTER ───────────────

  // 1. Laptop Mati Total
  if (q.includes('mati total') || q.includes('matot')) {
    return {
      contextText: 'Pertanyaan layanan perbaikan laptop mati total.',
      directAnswer:
        'Ya, kami berpengalaman menangani perbaikan laptop yang mengalami **mati total (matot)**. ' +
        'Tim teknisi AD Computer akan melakukan pemeriksaan menyeluruh pada jalur kelistrikan, power supply, IC power, serta komponen motherboard.\n\n' +
        '• **Estimasi Biaya Servis Hardware**: mulai dari **Rp 150.000** (biaya final akan disampaikan transparan melalui surat penawaran / quotation setelah diagnosa teknisi selesai).\n' +
        `• **Lokasi Workshop**: ${APP_CONFIG.company.address}\n\n` +
        'Anda dapat membawa perangkat langsung ke workshop kami atau melakukan pemesanan via menu [Layanan & Booking](/services).',
      showWhatsApp: true,
      userProblem: userQuery,
    };
  }

  // 2. Laptop / Komputer Lemot
  if (q.includes('lemot') || q.includes('lambat') || q.includes('ngelag') || q.includes('hang') || q.includes('benerin laptop lemot')) {
    return {
      contextText: 'Pertanyaan penanganan laptop lemot.',
      directAnswer:
        'Ya, tentu kami bisa memperbaiki laptop atau PC yang lemot! ' +
        'Gejala lemot umumnya disebabkan oleh penyimpanan harddisk lama yang lambat/bad sector, kapasitas RAM minim, suhu panas berlebih (thermal throttling karena pasta kering/kipas berdebu), atau sistem operasi yang terkena malware/corrupt.\n\n' +
        'Solusi layanan yang kami sediakan:\n' +
        '1. 🚀 **Upgrade ke High-Speed SSD & Tambah RAM**: Mulai **Rp 200.000** (proses cepat 1 - 2 jam, same-day service).\n' +
        '2. ❄️ **Deep Cleaning & Thermal Repasting Premium**: Mulai **Rp 150.000** (menurunkan suhu panas laptop secara signifikan).\n' +
        '3. 💻 **Instalasi Ulang OS Windows Bersih & Driver Lengkap**: Mulai **Rp 100.000**.\n\n' +
        'Silakan bawa perangkat Anda ke workshop AD Computer untuk kami periksa dan berikan solusi terbaik!',
      showWhatsApp: true,
      userProblem: userQuery,
    };
  }

  // 3. Instal / Reinstall Windows
  if (
    q.includes('instal ulang') ||
    q.includes('install ulang') ||
    q.includes('reinstall windows') ||
    q.includes('instal windows') ||
    q.includes('install windows') ||
    q.includes('inul') ||
    q.includes('reinstall os')
  ) {
    return {
      contextText: 'Pertanyaan layanan instal ulang sistem operasi Windows.',
      directAnswer:
        'Ya, kami melayani **Instalasi & Reinstall Sistem Operasi (OS)** termasuk Windows 10 dan Windows 11 resmi, lengkap dengan instalasi driver perangkat dan aplikasi standar pendukung (browser, office, media player, pdf reader, zip extractor).\n\n' +
        '• **Biaya**: Mulai dari **Rp 100.000**\n' +
        '• **Durasi Pengerjaan**: Sekitar 2 - 3 jam\n' +
        '• **Keamanan Data**: Tim teknisi kami juga siap membantu proses backup data penting Anda sebelum instalasi dilakukan.',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 4. Upgrade RAM dan SSD
  if (
    q.includes('upgrade ram') ||
    q.includes('upgrade ssd') ||
    q.includes('tambah ram') ||
    q.includes('ganti ssd') ||
    q.includes('pasang ssd')
  ) {
    return {
      contextText: 'Pertanyaan layanan upgrade RAM dan SSD.',
      directAnswer:
        'Ya, kami melayani **Upgrade RAM & High-Speed SSD** untuk berbagai merek laptop dan PC Desktop. ' +
        'Upgrade ke SSD NVMe/SATA akan membuat laptop Anda booting dalam hitungan detik dan bebas lemot.\n\n' +
        '• **Biaya Jasa & Konfigurasi**: Mulai dari **Rp 200.000**\n' +
        '• **Durasi Pengerjaan**: 1 - 2 jam (Same-Day Service)\n' +
        '• Anda dapat membawa part SSD/RAM sendiri atau membeli langsung melalui teknisi kami dengan garansi resmi.',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 5. Apakah bisa servis laptop / komputer
  if (
    (q.includes('bisa servis laptop') ||
      q.includes('bisa servis komputer') ||
      q.includes('bisa perbaiki laptop') ||
      q.includes('bisa benerin laptop') ||
      q.includes('bisa servis pc') ||
      q.includes('apakah bisa servis')) &&
    !q.includes('biaya')
  ) {
    return {
      contextText: 'Pertanyaan kemampuan servis laptop dan komputer AD Computer.',
      directAnswer:
        'Ya, tentu saja! **AD Computer** melayani perbaikan dan perawatan komprehensif untuk **laptop** maupun **komputer (PC Desktop)** dari berbagai merek (Asus, Lenovo, Acer, HP, Dell, Apple/MacBook, Axioo, MSI, dll.).\n\n' +
        'Layanan kami mencakup:\n' +
        '• **Perbaikan Hardware**: Motherboard, Layar LCD pecah/blank, Keyboard rusak, Engsel patah, Baterai drop, Port charger/USB.\n' +
        '• **Servis Laptop Mati Total**: Diagnosa kelistrikan & IC power.\n' +
        '• **Pembersihan & Suhu**: Deep cleaning & ganti thermal paste premium.\n' +
        '• **Upgrade Komponen**: RAM & High-Speed SSD (anti lemot).\n' +
        '• **Software & OS**: Instal ulang Windows 10/11, pembersihan virus/malware, recovery data.\n\n' +
        'Silakan bawa perangkat Anda ke workshop kami atau lakukan booking online!',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 6. Estimasi Biaya Servis
  if (
    q.includes('biaya servis') ||
    q.includes('berapa biaya') ||
    q.includes('berapa estimasi biaya') ||
    q.includes('estimasi biaya') ||
    q.includes('tarif servis') ||
    q.includes('ongkos servis') ||
    q.includes('harga servis')
  ) {
    return {
      contextText: 'Pertanyaan estimasi biaya servis di AD Computer.',
      directAnswer:
        'Estimasi biaya servis di **AD Computer** sangat terjangkau dengan standar pengerjaan profesional (harga estimasi dasar):\n\n' +
        '• 💻 **Instalasi OS Windows & Software**: Mulai **Rp 100.000** (2 - 3 jam)\n' +
        '• ❄️ **Deep Cleaning & Thermal Repasting Premium**: Mulai **Rp 150.000** (1 - 2 jam)\n' +
        '• 🛠️ **Computer & Laptop Repair Service (Hardware)**: Mulai **Rp 150.000** (1 - 3 hari kerja)\n' +
        '• 🚀 **Upgrade RAM & High-Speed SSD**: Mulai **Rp 200.000** (1 - 2 jam)\n' +
        '• 💾 **Data Recovery & Storage Restoration**: Mulai **Rp 350.000** (2 - 5 hari kerja)\n' +
        '• 🌐 **Setup Jaringan & Wi-Fi**: Mulai **Rp 500.000**\n\n' +
        '*Catatan: Biaya di atas merupakan tarif estimasi mulai dari. Biaya final pengerjaan akan disampaikan secara transparan melalui surat penawaran (quotation) setelah teknisi memeriksa perangkat langsung di workshop.*',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 7. Info Layanan / Daftar Layanan yang Tersedia
  if (
    q.includes('info layanan') ||
    q.includes('informasi layanan') ||
    q.includes('apa saja layanan') ||
    q.includes('layanan apa saja') ||
    q.includes('layanan yang tersedia') ||
    q.includes('daftar layanan') ||
    q.includes('katalog layanan') ||
    q.includes('apa layanan ad computer') ||
    (q.includes('layanan') && (q.includes('tersedia') || q.includes('ada apa') || q.includes('bisa apa')))
  ) {
    return {
      contextText: 'Pertanyaan daftar layanan yang tersedia di AD Computer.',
      directAnswer:
        'Berikut daftar layanan resmi yang tersedia di **AD Computer**:\n\n' +
        '1. 🛠️ **Computer & Laptop Repair Service** — Perbaikan hardware motherboard, LCD, keyboard, engsel, dll. (mulai Rp 150.000)\n' +
        '2. 🚀 **Upgrade RAM & High-Speed SSD** — Pemasangan dan migrasi sistem operasi agar anti lemot (mulai Rp 200.000)\n' +
        '3. 💻 **Instalasi & Reinstall Sistem Operasi (OS)** — Windows 10/11 resmi dan driver lengkap (mulai Rp 100.000)\n' +
        '4. ❄️ **Deep Cleaning & Thermal Repasting Premium** — Pembersihan kipas dan penggantian pasta termal (mulai Rp 150.000)\n' +
        '5. 💾 **Data Recovery & Storage Restoration** — Penyelamatan data hilang/terformat (mulai Rp 350.000)\n' +
        '6. 🌐 **Setup Jaringan Kantor, Mikrotik & Wi-Fi Mesh** — Instalasi jaringan LAN/Wi-Fi (mulai Rp 500.000)\n' +
        '7. 📹 **Instalasi & Maintenance Kamera CCTV** — Keamanan kantor/rumah (mulai Rp 450.000)\n' +
        '8. 👨‍💼 **Konsultasi IT & IT Support Maintenance Contract**\n\n' +
        'Semua pengerjaan bergaransi 30 hari. Anda dapat memilih layanan melalui menu [Layanan & Booking](/services) atau langsung berkonsultasi via WhatsApp Admin!',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 8. Cara Melakukan Pemesanan / Servis
  if (
    (q.includes('cara') || q.includes('bagaimana') || q.includes('gimana') || q.includes('prosedur')) &&
    (q.includes('pemesanan') || q.includes('pesan') || q.includes('booking') || q.includes('melakukan servis') || q.includes('servis di sini'))
  ) {
    return {
      contextText: 'Panduan prosedur pemesanan servis di AD Computer.',
      directAnswer:
        'Untuk melakukan pemesanan servis di **AD Computer**, Anda dapat memilih metode yang paling mudah:\n\n' +
        '1. **Booking Online (Website)**:\n' +
        '   - Login ke akun Customer Anda di website.\n' +
        '   - Buka menu [Layanan & Booking](/customer/services).\n' +
        '   - Pilih jenis layanan dan tipe servis (*Antar ke Toko / Workshop* atau *Kunjungan Teknisi / Onsite*).\n' +
        '   - Tuliskan keluhan perangkat dan tentukan jadwal kedatangan.\n\n' +
        '2. **Datang Langsung ke Workshop**:\n' +
        `   - Bawa perangkat Anda langsung ke workshop kami di **${APP_CONFIG.company.address}** pada jam kerja (Senin - Sabtu: 09.00 - 18.00 WIB).\n\n` +
        '3. **Konsultasi via WhatsApp Admin**:\n' +
        `   - Hubungi kami langsung di **${APP_CONFIG.company.phone}** untuk konsultasi cepat sebelum datang.`,
      showWhatsApp: true,
      userProblem: userQuery,
    };
  }

  // 9. Cara Menghubungi Admin
  if (
    (q.includes('hubungi') || q.includes('kontak') || q.includes('nomor') || q.includes('wa admin') || q.includes('whatsapp admin') || q.includes('telepon')) &&
    (q.includes('admin') || q.includes('ad computer') || q.includes('cs') || q.includes('toko'))
  ) {
    return {
      contextText: 'Informasi kontak dan cara menghubungi Admin AD Computer.',
      directAnswer:
        'Anda dapat menghubungi Admin **AD Computer** melalui saluran resmi berikut:\n\n' +
        `• 📱 **WhatsApp / Telepon**: **${APP_CONFIG.company.phone}**\n` +
        `• 📧 **Email**: ${APP_CONFIG.company.email}\n` +
        `• 📍 **Alamat Workshop**: ${APP_CONFIG.company.address}\n` +
        `• ⏰ **Jam Operasional**: ${APP_CONFIG.company.hours} (Minggu & Hari Libur Nasional: Tutup)\n\n` +
        'Klik tombol di bawah jika ingin langsung memulai obrolan WhatsApp dengan Admin kami!',
      showWhatsApp: true,
      userProblem: userQuery,
    };
  }

  // 10. Jam Operasional
  if (
    q.includes('jam operasional') ||
    q.includes('jam buka') ||
    q.includes('jam kerja') ||
    q.includes('hari buka') ||
    q.includes('buka jam berapa')
  ) {
    return {
      contextText: 'Informasi jam operasional AD Computer.',
      directAnswer:
        `Jam operasional workshop **AD Computer**:\n\n` +
        `• 🕒 **Senin - Sabtu**: 09.00 - 18.00 WIB\n` +
        `• 🚫 **Minggu & Hari Libur Nasional**: TUTUP\n\n` +
        `Untuk pertanyaan di luar jam operasional, Anda dapat meninggalkan pesan melalui WhatsApp Admin di **${APP_CONFIG.company.phone}** dan tim kami akan merespons pada jam kerja berikutnya.`,
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 11. Alamat dan Lokasi Workshop
  if (
    (q.includes('alamat') || q.includes('lokasi')) &&
    (q.includes('toko') || q.includes('workshop') || q.includes('ad computer') || q.includes('dimana') || q.includes('di mana'))
  ) {
    return {
      contextText: 'Informasi alamat dan lokasi workshop AD Computer.',
      directAnswer:
        `Alamat workshop resmi **AD Computer**:\n\n` +
        `📍 **${APP_CONFIG.company.address}**\n\n` +
        `• **WhatsApp / Telepon**: ${APP_CONFIG.company.phone}\n` +
        `• **Jam Buka**: ${APP_CONFIG.company.hours} (Senin - Sabtu)\n\n` +
        'Kami melayani servis datang langsung ke workshop maupun layanan kunjungan teknisi (Onsite) untuk area Cirebon dan sekitarnya.',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 12. Prosedur Pengambilan Perangkat
  if (
    (q.includes('prosedur') || q.includes('cara') || q.includes('gimana') || q.includes('syarat')) &&
    (q.includes('pengambilan') || q.includes('ambil perangkat') || q.includes('ambil laptop') || q.includes('mengambil'))
  ) {
    return {
      contextText: 'Prosedur pengambilan perangkat servis di AD Computer.',
      directAnswer:
        'Prosedur pengambilan perangkat yang telah selesai diservis di **AD Computer**:\n\n' +
        '1. **Konfirmasi Selesai**: Pastikan status servis Anda telah berstatus **Selesai & Siap Diambil** (bisa dicek lewat menu pesanan/lacak tiket).\n' +
        `2. **Kunjungi Workshop**: Datang ke workshop kami di **${APP_CONFIG.company.address}** pada jam kerja.\n` +
        '3. **Tunjukkan Nomor Tiket**: Informasikan nomor tiket servis Anda (misal: *SRV-2026-001*) kepada staf/teknisi kami.\n' +
        '4. **Pengecekan Fisik & Fungsi**: Uji perangkat secara langsung bersama teknisi kami untuk memastikan semua keluhan telah teratasi dengan baik.\n' +
        '5. **Pelunasan Pembayaran**: Selesaikan pelunasan jika masih ada sisa tagihan penawaran.\n' +
        '6. **Nota & Garansi**: Terima perangkat beserta nota resmi dan kartu garansi pengerjaan 30 hari.',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 13. Cek Status Servis / Pertanyaan Status Selesai
  if (
    (q.includes('sudah selesai') || q.includes('udah selesai') || q.includes('sudah jadi') || q.includes('udah jadi')) &&
    (q.includes('perangkat') || q.includes('laptop') || q.includes('komputer') || q.includes('servis') || q.includes('pesanan'))
  ) {
    if (!session) {
      return {
        contextText: 'Customer menanyakan status selesai tapi belum login.',
        directAnswer:
          'Untuk mengecek apakah perangkat Anda sudah selesai diperbaiki, silakan **login** ke akun Customer Anda atau masukkan nomor tiket servis Anda di halaman [Lacak Servis](/track).',
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }

    const myOrders = await prisma.serviceOrder.findMany({
      where: { customerId: session.userId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });

    if (myOrders.length === 0) {
      return {
        contextText: `Customer ${session.name} tidak memiliki order aktif.`,
        directAnswer:
          `Halo **${session.name}**, saat ini tidak ada pesanan servis aktif yang tercatat atas nama akun Anda. ` +
          'Jika Anda ingin melakukan perbaikan, silakan buat [Booking Servis Baru](/customer/services).',
        showWhatsApp: false,
        userProblem: userQuery,
      };
    }

    const completed = myOrders.find(o => o.status === 'READY_FOR_PICKUP' || o.status === 'COMPLETED' || o.status === 'DELIVERED');
    if (completed) {
      const st = STATUS_LABELS[completed.status] || completed.status;
      return {
        contextText: `Pesanan customer ${completed.ticketNumber} sudah selesai.`,
        directAnswer:
          `Kabar baik, **${session.name}**! Perangkat Anda pada tiket **#${completed.ticketNumber}** (${completed.deviceBrand} ${completed.deviceModel}) saat ini berstatus: **${st}** 🎉\n\n` +
          `Silakan datang ke workshop AD Computer di ${APP_CONFIG.company.address} untuk pengambilan perangkat.`,
        showWhatsApp: false,
        userProblem: userQuery,
      };
    }

    const activeOrder = myOrders[0];
    const st = STATUS_LABELS[activeOrder.status] || activeOrder.status;
    return {
      contextText: `Pesanan customer ${activeOrder.ticketNumber} masih diproses (${activeOrder.status}).`,
      directAnswer:
        `Halo **${session.name}**, pesanan servis Anda dengan tiket **#${activeOrder.ticketNumber}** (${activeOrder.deviceBrand} ${activeOrder.deviceModel}) saat ini berstatus: **${st}**.\n\n` +
        'Teknisi kami sedang mengerjakan unit dengan teliti. Anda akan menerima notifikasi otomatis segera setelah perangkat siap diambil!',
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 1. DATA BISNIS & OPERASIONAL
  contextParts.push(`[INFO BISNIS & OPERASIONAL]
Nama: ${APP_CONFIG.name}
Alamat: ${APP_CONFIG.company.address}
WhatsApp/Telepon: ${APP_CONFIG.company.phone}
Jam Operasional: ${APP_CONFIG.company.hours}`);

  // 2. CEK TIKET SPESIFIK JIKA DISEBUTKAN
  if (ticketNum) {
    if (!session) {
      directAnswer = `Untuk memeriksa status tiket **${ticketNum}**, silakan login ke akun Anda terlebih dahulu untuk menjaga kerahasiaan data pemilik perangkat. Anda juga dapat memeriksa di menu [Lacak Status Servis](/track).`;
      return {
        contextText: `Customer meminta info tiket ${ticketNum} namun belum login.`,
        directAnswer,
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }

    // Cari tiket di database
    const order = await prisma.serviceOrder.findUnique({
      where: { ticketNumber: ticketNum },
      include: {
        service: { select: { name: true, category: true } },
        diagnosis: true,
        quotation: {
          include: { items: true },
        },
        payments: {
          select: { id: true, amount: true, paymentMethod: true, paymentStatus: true, paymentDate: true },
        },
      },
    });

    if (!order) {
      directAnswer = `Nomor tiket **${ticketNum}** tidak ditemukan dalam database kami. Pastikan nomor tiket yang Anda masukkan sudah benar (contoh: *SRV-2026-001*).`;
      return {
        contextText: `Tiket ${ticketNum} tidak ditemukan di database.`,
        directAnswer,
        notFoundTicket: ticketNum,
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }

    // SECURITY CHECK: Pastikan tiket milik user yang sedang login!
    if (order.customerId !== session.userId) {
      directAnswer = `Mohon maaf, tiket **${ticketNum}** tidak terdaftar pada akun Anda (${session.name}). Demi keamanan privasi, kami tidak dapat menampilkan data perangkat milik customer lain.`;
      return {
        contextText: `SECURITY ALERT: User ${session.name} (${session.userId}) mencoba mengakses tiket ${ticketNum} milik customer lain. Akses ditolak.`,
        directAnswer,
        forbiddenTicket: ticketNum,
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }

    // Tiket valid dan milik customer
    const statusText = STATUS_LABELS[order.status] || order.status;
    let orderDetail = `[DETAIL SERVICE ORDER MILIK CUSTOMER: ${order.ticketNumber}]
Perangkat: ${order.deviceBrand} ${order.deviceModel} (${order.deviceType})
Layanan: ${order.service?.name || 'Servis Umum'}
Keluhan: ${order.problemDescription}
Status Saat Ini: ${statusText} (${order.status})
Tanggal Masuk: ${formatDateIndo(order.createdAt)}
Tipe Servis: ${order.serviceType === 'onsite' ? 'Onsite (Kunjungan Teknisi ke Lokasi)' : 'Workshop (Datang ke Toko)'}`;

    if (order.diagnosis) {
      orderDetail += `\nDiagnosa Teknisi: ${order.diagnosis.diagnosis}\nRekomendasi: ${order.diagnosis.recommendation}\nEstimasi Biaya: ${formatRupiah(order.diagnosis.estimatedCost)}`;
    }

    if (order.quotation) {
      orderDetail += `\nPenawaran Biaya: Total ${formatRupiah(order.quotation.total)} (Status: ${order.quotation.status})`;
    }

    if (order.payments && order.payments.length > 0) {
      const pList = order.payments.map(p => `- ${formatRupiah(p.amount)} (${PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus}, metode: ${p.paymentMethod})`).join('\n');
      orderDetail += `\nPembayaran Terkait:\n${pList}`;
    }

    contextParts.push(orderDetail);

    directAnswer = `Berikut informasi terbaru mengenai Service Order Anda:
- **No. Tiket**: ${order.ticketNumber}
- **Perangkat**: ${order.deviceBrand} ${order.deviceModel}
- **Keluhan**: ${order.problemDescription}
- **Status Saat Ini**: **${statusText}**
- **Tanggal Masuk**: ${formatDateIndo(order.createdAt)}${order.diagnosis ? `\n- **Diagnosa Teknisi**: ${order.diagnosis.diagnosis}\n- **Estimasi Biaya**: ${formatRupiah(order.diagnosis.estimatedCost)}` : ''}${order.quotation ? `\n- **Total Biaya**: ${formatRupiah(order.quotation.total)} (Status: ${order.quotation.status})` : ''}

Jika ada pertanyaan lebih lanjut, silakan tanyakan kepada saya atau hubungi Admin kami.`;

    return {
      contextText: contextParts.join('\n\n'),
      directAnswer,
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 3. JIKA CUSTOMER TANYA TENTANG PEMBAYARAN / TAGIHAN (Dahulukan sebelum order umum)
  if (isPaymentsQuery(q)) {
    if (!session) {
      directAnswer = `Untuk melihat riwayat pembayaran dan status tagihan servis Anda, silakan login ke akun Anda terlebih dahulu.`;
      return {
        contextText: `Customer menanyakan pembayaran tapi belum login.`,
        directAnswer,
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }

    const payments = await prisma.payment.findMany({
      where: {
        serviceOrder: { customerId: session.userId },
      },
      include: {
        serviceOrder: {
          select: { ticketNumber: true, deviceBrand: true, deviceModel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (payments.length === 0) {
      directAnswer = `Halo **${session.name}**, saat ini belum ada catatan riwayat pembayaran pada akun Anda. Pembayaran akan tercatat setelah perangkat Anda selesai didiagnosa dan disetujui untuk perbaikan.`;
      return {
        contextText: `Customer ${session.name} tidak memiliki riwayat pembayaran di database.`,
        directAnswer,
        showWhatsApp: false,
        userProblem: userQuery,
      };
    }

    const paySummary = payments.map(p => {
      const st = PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus;
      return `- **Tiket ${p.serviceOrder.ticketNumber}** (${p.serviceOrder.deviceBrand} ${p.serviceOrder.deviceModel}): ${formatRupiah(p.amount)} — Status: **${st}** (Metode: ${p.paymentMethod})`;
    }).join('\n');

    directAnswer = `Halo **${session.name}**, berikut ringkasan riwayat pembayaran Anda yang tercatat di database:

${paySummary}

Jika Anda telah melakukan pembayaran via Transfer/QRIS dan butuh konfirmasi cepat, Anda dapat menghubungi Admin kami.`;

    contextParts.push(`[RIWAYAT PEMBAYARAN CUSTOMER: ${session.name}]\n${paySummary}`);

    return {
      contextText: contextParts.join('\n\n'),
      directAnswer,
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 4. JIKA CUSTOMER TANYA TENTANG ORDER / STATUS SAYA SECARA UMUM
  if (isOrdersQuery(q)) {
    if (!session) {
      directAnswer = `Untuk memeriksa status Service Order Anda, silakan login terlebih dahulu. Jika Anda memiliki nomor tiket (misal: *SRV-2026-001*), Anda juga dapat langsung mengetikkannya di sini atau melalui halaman [Lacak Servis](/track).`;
      return {
        contextText: `Customer menanyakan order tapi belum login.`,
        directAnswer,
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }

    const myOrders = await prisma.serviceOrder.findMany({
      where: { customerId: session.userId },
      include: {
        service: { select: { name: true } },
        diagnosis: { select: { diagnosis: true, estimatedCost: true } },
        quotation: { select: { total: true, status: true } },
        payments: { select: { amount: true, paymentStatus: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    if (myOrders.length === 0) {
      directAnswer = `Halo **${session.name}**, saat ini belum ada Service Order yang terdaftar atas nama akun Anda. Jika Anda ingin melakukan perbaikan perangkat, Anda dapat membuat [Booking Servis Baru](/customer/services) atau berkonsultasi via WhatsApp dengan Admin kami.`;
      return {
        contextText: `Customer ${session.name} belum memiliki service order di database.`,
        directAnswer,
        showWhatsApp: true,
        userProblem: userQuery,
      };
    }

    const ordersSummary = myOrders.map((o) => {
      const st = STATUS_LABELS[o.status] || o.status;
      return `- **${o.ticketNumber}** (${o.deviceBrand} ${o.deviceModel}): Status saat ini **${st}** (Masuk: ${formatDateIndo(o.createdAt)})`;
    }).join('\n');

    directAnswer = `Halo **${session.name}**, berikut daftar Service Order Anda yang tercatat di sistem:

${ordersSummary}

Ketikkan nomor tiket (contoh: *${myOrders[0].ticketNumber}*) jika Anda ingin melihat rincian diagnosa, biaya, atau status pembayaran untuk tiket tertentu.`;

    contextParts.push(`[DAFTAR SERVICE ORDER MILIK ${session.name} (${session.userId})]
${myOrders.map(o => `- Tiket: ${o.ticketNumber} | Perangkat: ${o.deviceBrand} ${o.deviceModel} | Status: ${STATUS_LABELS[o.status] || o.status} | Keluhan: ${o.problemDescription}`).join('\n')}`);

    return {
      contextText: contextParts.join('\n\n'),
      directAnswer,
      showWhatsApp: false,
      userProblem: userQuery,
    };
  }

  // 5. KATALOG LAYANAN & KNOWLEDGE BASE
  // Data layanan + FAQ/kebijakan kini disuntikkan secara konsisten oleh
  // src/lib/ai-knowledge.ts pada SETIAP pemanggilan AI (cache 60 detik).
  // Dengan begitu AI dapat menjawab pertanyaan bebas dan pertanyaan lanjutan
  // tanpa bergantung pada keyword matching, dan tanpa query DB berulang.

  return {
    contextText: contextParts.join('\n\n'),
    directAnswer,
    showWhatsApp,
    userProblem: userQuery,
  };
}

/**
 * Mengambil data kontekstual yang aman untuk Admin
 */
export async function getAdminDatabaseContext(
  adminSession: UserSessionContext,
  userQuery: string
): Promise<DatabaseQueryResult> {
  const q = userQuery.toLowerCase();
  const ticketNum = extractTicketNumber(userQuery);

  let contextParts: string[] = [];
  let directAnswer: string | undefined = undefined;

  // ── PRIORITAS -1: PERTANYAAN IDENTITAS AI CHATBOT (ADMIN) ────────────────
  if (isAssistantIdentityQuery(q)) {
    return {
      contextText: 'Pertanyaan tentang identitas resmi AI Assistant AD Computer untuk Admin.',
      directAnswer:
        'Saya adalah AI Assistant AD Computer, asisten virtual resmi AD Computer yang siap membantu Anda dalam mengelola operasional servis, memantau ringkasan pesanan, diagnosa teknisi, serta navigasi dashboard Admin.\n\n' +
        'Sebagai Admin, Anda dapat menanyakan jumlah seluruh pesanan, pesanan yang belum selesai, pesanan terbaru, statistik data pengguna, hingga detail tiket servis tertentu. Ada yang bisa saya bantu?',
      showWhatsApp: false,
    };
  }

  // ── PRIORITAS 0: PERTANYAAN IDENTITAS ADMIN ──────────────────────────────
  if (isIdentityQuery(q)) {
    const profile = await getUserFullProfile(adminSession.userId);
    if (!profile) {
      return {
        contextText: `Profil admin ${adminSession.userId} tidak ditemukan di database.`,
        directAnswer:
          'Maaf, profil akun Admin tidak dapat ditemukan dalam database. ' +
          'Silakan hubungi administrator sistem.',
        showWhatsApp: false,
      };
    }
    return {
      contextText: `[PROFIL ADMIN TERVERIFIKASI]\nNama: ${profile.name}\nEmail: ${profile.email}\nRole: ${profile.role}`,
      directAnswer: buildAdminProfileAnswer(profile),
      showWhatsApp: false,
    };
  }

  // 1. JIKA ADMIN MENCARI TIKET SPESIFIK
  if (ticketNum) {
    const order = await prisma.serviceOrder.findUnique({
      where: { ticketNumber: ticketNum },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { name: true, category: true } },
        diagnosis: true,
        quotation: { include: { items: true } },
        payments: true,
      },
    });

    if (!order) {
      directAnswer = `Service Order dengan tiket **${ticketNum}** tidak ditemukan di database.`;
      return {
        contextText: `Tiket ${ticketNum} tidak ditemukan.`,
        directAnswer,
        showWhatsApp: false,
      };
    }

    const st = STATUS_LABELS[order.status] || order.status;
    let detail = `[DATA LENGKAP ORDER ADMIN: ${order.ticketNumber}]
Customer: ${order.customer.name} (${order.customer.phone || '-'}, ${order.customer.email})
Perangkat: ${order.deviceBrand} ${order.deviceModel} (${order.deviceType})
Layanan: ${order.service?.name || '-'}
Keluhan: ${order.problemDescription}
Status: ${st} (${order.status})
Tipe: ${order.serviceType} ${order.address ? `(Alamat: ${order.address})` : ''}
Tanggal Masuk: ${formatDateIndo(order.createdAt)}`;

    if (order.diagnosis) {
      detail += `\nDiagnosa: ${order.diagnosis.diagnosis}\nRekomendasi: ${order.diagnosis.recommendation}\nEstimasi Biaya: ${formatRupiah(order.diagnosis.estimatedCost)}`;
    }
    if (order.quotation) {
      detail += `\nQuotation: ${order.quotation.quotationNumber} Total: ${formatRupiah(order.quotation.total)} (${order.quotation.status})`;
    }
    if (order.payments && order.payments.length > 0) {
      const pList = order.payments.map(p => `- ${formatRupiah(p.amount)} [${p.paymentStatus}] via ${p.paymentMethod}`).join(', ');
      detail += `\nPembayaran: ${pList}`;
    }

    contextParts.push(detail);

    directAnswer = `**Data Service Order: ${order.ticketNumber}**
- **Customer**: ${order.customer.name} (${order.customer.phone || '-'})
- **Perangkat**: ${order.deviceBrand} ${order.deviceModel} (${order.deviceType})
- **Status**: **${st}**
- **Keluhan**: ${order.problemDescription}
- **Tanggal Masuk**: ${formatDateIndo(order.createdAt)}
${order.diagnosis ? `- **Diagnosa**: ${order.diagnosis.diagnosis} (Est. Biaya: ${formatRupiah(order.diagnosis.estimatedCost)})\n` : ''}${order.quotation ? `- **Quotation**: ${order.quotation.quotationNumber} (${formatRupiah(order.quotation.total)} - ${order.quotation.status})\n` : ''}${order.payments.length > 0 ? `- **Pembayaran**: ${order.payments.map(p => `${formatRupiah(p.amount)} (${p.paymentStatus})`).join(', ')}` : '- **Pembayaran**: Belum ada transaksi'}`;

    return {
      contextText: contextParts.join('\n\n'),
      directAnswer,
      showWhatsApp: false,
    };
  }

  // ── 1b. DIREKTORI CUSTOMER (data aktual database, khusus Admin) ──────────
  const customerAnswer = await buildAdminCustomerAnswer(userQuery);
  if (customerAnswer) {
    return {
      contextText: customerAnswer.contextText,
      directAnswer: customerAnswer.directAnswer,
      showWhatsApp: false,
    };
  }

  // 2. QUERY LENGKAP OPERASIONAL DARI DATABASE AKTUAL
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    stats,
    recentOrders,
    paymentStats,
    servicesCount,
    userRoleStats,
    adminUsers,
    todayOrdersCount,
  ] = await Promise.all([
    prisma.serviceOrder.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.serviceOrder.findMany({
      select: {
        ticketNumber: true,
        customer: { select: { name: true, phone: true } },
        deviceBrand: true,
        deviceModel: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.payment.groupBy({
      by: ['paymentStatus'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.service.count({ where: { isActive: true } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { name: true, email: true },
    }),
    prisma.serviceOrder.count({
      where: {
        createdAt: { gte: startOfToday },
      },
    }),
  ]);

  const totalOrders = stats.reduce((acc, curr) => acc + curr._count._all, 0);
  const adminCount = userRoleStats.find(u => u.role === 'ADMIN')?._count._all || 0;
  const customerCount = userRoleStats.find(u => u.role === 'CUSTOMER')?._count._all || 0;
  const totalUsersCount = userRoleStats.reduce((acc, curr) => acc + curr._count._all, 0);

  const unfinishedStatuses = ['SUBMITTED', 'PENDING', 'DIAGNOSING', 'QUOTED', 'IN_REPAIR', 'WAITING_SPAREPART'];
  const finishedStatuses = ['READY_FOR_PICKUP', 'COMPLETED', 'DELIVERED'];

  const unfinishedCount = stats
    .filter(s => unfinishedStatuses.includes(s.status))
    .reduce((acc, curr) => acc + curr._count._all, 0);

  const finishedCount = stats
    .filter(s => finishedStatuses.includes(s.status))
    .reduce((acc, curr) => acc + curr._count._all, 0);

  const inRepairCount = stats
    .filter(s => s.status === 'IN_REPAIR')
    .reduce((acc, curr) => acc + curr._count._all, 0);

  const statusSummary = stats.map(s => `- ${STATUS_LABELS[s.status] || s.status}: ${s._count._all} order`).join('\n');
  const recentList = recentOrders.map(o => `- **${o.ticketNumber}** | ${o.customer.name} | ${o.deviceBrand} ${o.deviceModel} | **${STATUS_LABELS[o.status] || o.status}** (${formatDateIndo(o.createdAt)})`).join('\n');
  const paySummary = paymentStats.map(p => `- ${PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus}: ${p._count._all} transaksi (Total: ${formatRupiah(p._sum.amount || 0)})`).join('\n');

  contextParts.push(`[STATISTIK DATABASE AKTUAL UNTUK ADMIN]
Total Service Order: ${totalOrders} order
- Pesanan Belum Selesai: ${unfinishedCount} order
- Pesanan Sudah Selesai: ${finishedCount} order
- Pesanan Sedang Dikerjakan (In Repair): ${inRepairCount} order
- Pesanan Hari Ini: ${todayOrdersCount} order

Rincian Status:
${statusSummary}

Ringkasan Keuangan/Pembayaran:
${paySummary}

Total Layanan Aktif: ${servicesCount}

Order Terbaru:
${recentList}

[STRUKTUR ROLE WEBSITE & DATA PENGGUNA TERDAFTAR]
Website AD Computer memiliki 3 jenis role:
1. Admin: Bertugas mengelola website dan pesanan servis.
2. Customer: Menggunakan layanan website.
3. AI Assistant: Asisten virtual cerdas yang membantu menjawab pertanyaan dan memberikan informasi secara otomatis (BUKAN akun pengguna manusia dan TIDAK tersimpan di tabel database).

DATA AKUN TERDAFTAR DI DATABASE:
- Jumlah Akun Admin: ${adminCount} akun (${adminUsers.map(a => `${a.name} <${a.email}>`).join(', ')})
- Jumlah Akun Customer: ${customerCount} akun
- Total Akun Pengguna Terdaftar: ${totalUsersCount} akun`);

  // ── 2b. RINGKASAN CUSTOMER UNTUK PERTANYAAN BEBAS ────────────────────────
  const isRoleDifferenceQuery =
    /(perbedaan|beda|apa beda)/.test(q) && /(admin|customer|role|ai)/.test(q);

  if (isCustomerRelatedQuery(q) && !isRoleDifferenceQuery) {
    try {
      const [customerTotal, latestCustomers] = await Promise.all([
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.findMany({
          where: { role: 'CUSTOMER' },
          select: CUSTOMER_SELECT,
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      contextParts.push(`[DATA CUSTOMER DARI DATABASE]
Total customer terdaftar: ${customerTotal}
Customer terbaru (maksimal 10):
${
  latestCustomers.length > 0
    ? latestCustomers
        .map((customer, index) => formatCustomerLine(customer as CustomerDirectoryRow, index + 1))
        .join('\n')
    : '- Belum ada customer terdaftar'
}`);
    } catch {
      contextParts.push('[DATA CUSTOMER DARI DATABASE] Data customer tidak dapat dimuat saat ini.');
    }
  }

  // ── 3. DETEKSI INTENT PERTANYAAN KHUSUS ADMIN ───────────────────────────

  // A. Perbedaan Admin, Customer, dan AI Assistant
  if (
    (q.includes('perbedaan') || q.includes('beda') || q.includes('apa beda')) &&
    (q.includes('admin') || q.includes('customer') || q.includes('ai') || q.includes('role'))
  ) {
    directAnswer = `Berikut perbedaan peran antara **Admin**, **Customer**, dan **AI Assistant** di sistem AD Computer:

1. **Admin**:
   - **Peran**: Pengelola sistem dan operasional layanan servis.
   - **Tugas**: Mengelola pesanan servis masuk, menginput diagnosa teknisi, menerbitkan surat penawaran (*quotation*), memverifikasi pembayaran, serta mengelola basis pengetahuan (*knowledge base*) dan data customer.
   - **Database**: Tersimpan sebagai akun pengguna di tabel \`users\` dengan role \`ADMIN\`.

2. **Customer**:
   - **Peran**: Pengguna/klien yang memanfaatkan layanan servis komputer/laptop.
   - **Tugas**: Mengajukan pemesanan (*booking*) servis, memantau progres perbaikan unit, menyetujui atau menolak penawaran biaya, serta melakukan pembayaran tagihan.
   - **Database**: Tersimpan sebagai akun pengguna di tabel \`users\` dengan role \`CUSTOMER\`.

3. **AI Assistant**:
   - **Peran**: Asisten virtual cerdas resmi AD Computer.
   - **Tugas**: Membantu menjawab pertanyaan pengunjung seputar layanan, harga estimasi, garansi, diagnosa awal, serta membantu Admin dalam analisis operasional secara otomatis 24 jam.
   - **Database**: **Bukan akun pengguna manusia** dan tidak memiliki baris data di tabel \`users\` database.`;
  }

  // B. Pertanyaan jumlah akun customer
  else if (
    (q.includes('customer') || q.includes('pelanggan')) &&
    (q.includes('berapa akun') || q.includes('ada berapa akun') || q.includes('jumlah akun') ||
     q.includes('total akun') || q.includes('berapa customer') || q.includes('jumlah customer') ||
     q.includes('total customer') || q.includes('ada berapa customer') || q.includes('data customer'))
  ) {
    directAnswer = `Berdasarkan data aktual database saat ini, terdapat **${customerCount} akun Customer** yang terdaftar di website AD Computer.

Customer-customer ini terdaftar di tabel pengguna (\`users\`) dan dapat membuat pesanan servis, memantau perbaikan perangkat, serta melakukan pembayaran secara mandiri.`;
  }

  // C. Pertanyaan jumlah akun admin
  else if (
    q.includes('admin') &&
    (q.includes('berapa akun') || q.includes('ada berapa admin') || q.includes('jumlah admin') ||
     q.includes('total admin') || q.includes('berapa admin') || q.includes('ada berapa akun admin'))
  ) {
    const adminNames = adminUsers.map(a => `**${a.name}** (${a.email})`).join(', ');
    directAnswer = `Berdasarkan data aktual database saat ini, terdapat **${adminCount} akun Admin** yang terdaftar di website AD Computer${adminNames ? `, yaitu: ${adminNames}` : ''}.

Akun Admin memiliki wewenang penuh dalam mengelola sistem, pesanan servis, diagnosa teknisi, penawaran biaya, dan data pelanggan.`;
  }

  // D. Pertanyaan total akun yang terdaftar
  else if (
    (q.includes('total akun') || q.includes('semua akun') || q.includes('jumlah akun') ||
     (q.includes('akun') && (q.includes('terdaftar') || q.includes('di database') || q.includes('keseluruhan')))) &&
    (q.includes('berapa') || q.includes('total') || q.includes('jumlah') || q.includes('ada berapa'))
  ) {
    directAnswer = `Total akun yang terdaftar di database website AD Computer saat ini adalah **${totalUsersCount} akun**, yang terdiri dari:

- **${adminCount} akun Admin**
- **${customerCount} akun Customer**

*(Catatan: Perlu diingat bahwa **AI Assistant** adalah asisten virtual di website dan tidak dihitung sebagai akun pengguna yang tersimpan di tabel database).*`;
  }

  // E. Pertanyaan jenis role / role yang tersedia
  else if (
    q.includes('jenis role') ||
    q.includes('macam role') ||
    q.includes('apa saja role') ||
    q.includes('role apa saja') ||
    q.includes('role yang tersedia') ||
    q.includes('daftar role') ||
    (q.includes('role') && (q.includes('tersedia') || q.includes('ada berapa') || q.includes('berapa jenis')))
  ) {
    directAnswer = `Website AD Computer memiliki **3 jenis role**, yaitu:

1. **Admin**
2. **Customer**
3. **AI Assistant**

**Admin** bertugas mengelola website dan pesanan servis, **Customer** menggunakan layanan website, sedangkan **AI Assistant** membantu menjawab pertanyaan dan memberikan informasi secara otomatis.

*(Catatan: Admin dan Customer merupakan akun pengguna yang terdaftar di database, sedangkan AI Assistant adalah asisten virtual di website).*`;
  }

  // F. Pertanyaan "Ada berapa user di website ini?"
  else if (
    (q.includes('user') || q.includes('pengguna')) &&
    (q.includes('berapa') || q.includes('ada berapa') || q.includes('jumlah') || q.includes('total'))
  ) {
    directAnswer = `Website AD Computer memiliki 3 jenis role, yaitu:

1. Admin
2. Customer
3. AI Assistant

Admin bertugas mengelola website dan pesanan servis, Customer menggunakan layanan website, sedangkan AI Assistant membantu menjawab pertanyaan dan memberikan informasi secara otomatis.

Saat ini di database terdaftar total **${totalUsersCount} akun**, yang terdiri dari:
- **${adminCount} akun Admin**
- **${customerCount} akun Customer**

*(Catatan: AI Assistant merupakan asisten virtual yang tersedia di website, bukan akun manusia yang tersimpan di tabel users).*`;
  }

  // G. Berapa pesanan yang belum selesai
  else if (
    (q.includes('belum selesai') || q.includes('pending') || q.includes('dalam proses') || q.includes('belum kelar')) &&
    (q.includes('pesanan') || q.includes('order') || q.includes('berapa'))
  ) {
    const unfinishedList = stats
      .filter(s => unfinishedStatuses.includes(s.status))
      .map(s => `- **${STATUS_LABELS[s.status] || s.status}**: ${s._count._all} order`)
      .join('\n');

    directAnswer = `Berdasarkan data database saat ini, terdapat **${unfinishedCount} pesanan servis yang belum selesai** dari total ${totalOrders} pesanan:\n\n` +
      `${unfinishedList || '- Tidak ada pesanan pending'}\n\n` +
      `Anda dapat membuka menu [Orders](/admin/orders) untuk memperbarui status pengerjaan unit.`;
  }

  // H. Berapa pesanan yang sudah selesai
  else if (
    (q.includes('sudah selesai') || q.includes('telah selesai') || q.includes('selesai')) &&
    (q.includes('pesanan') || q.includes('order') || q.includes('berapa')) &&
    !q.includes('belum')
  ) {
    const finishedList = stats
      .filter(s => finishedStatuses.includes(s.status))
      .map(s => `- **${STATUS_LABELS[s.status] || s.status}**: ${s._count._all} order`)
      .join('\n');

    directAnswer = `Berdasarkan data database saat ini, terdapat **${finishedCount} pesanan servis yang sudah selesai**:\n\n` +
      `${finishedList || '- Belum ada pesanan yang selesai'}\n\n` +
      `Perangkat yang berstatus *Selesai & Siap Diambil* dapat diserahkan kepada customer saat pengambilan unit di workshop.`;
  }

  // I. Berapa pesanan yang sedang dikerjakan
  else if (
    (q.includes('sedang dikerjakan') || q.includes('dikerjakan') || q.includes('dalam perbaikan') || q.includes('in repair') || q.includes('in progress')) &&
    (q.includes('pesanan') || q.includes('order') || q.includes('berapa'))
  ) {
    directAnswer = `Berdasarkan data database saat ini, terdapat **${inRepairCount} pesanan servis yang sedang dikerjakan** (*In Repair / Dalam Perbaikan*) oleh tim teknisi.\n\n` +
      `Silakan cek menu [Orders](/admin/orders) untuk melihat rincian tiket yang sedang dalam perbaikan.`;
  }

  // J. Tampilkan pesanan terbaru
  else if (
    (q.includes('pesanan terbaru') || q.includes('order terbaru') || q.includes('tampilkan pesanan') || q.includes('daftar pesanan terbaru'))
  ) {
    directAnswer = `Berikut **5 pesanan servis terbaru** yang tercatat di database AD Computer:\n\n` +
      `${recentList}\n\n` +
      `Ketikkan nomor tiket (contoh: *${recentOrders[0]?.ticketNumber || 'SRV-2026-001'}*) untuk melihat rincian diagnosa, penawaran, dan pembayaran tiket tersebut.`;
  }

  // K. Berapa jumlah seluruh pesanan / Total pesanan
  else if (
    (q.includes('jumlah seluruh pesanan') || q.includes('total pesanan') || q.includes('semua pesanan') || q.includes('berapa pesanan') || q.includes('banyak pesanan') || q.includes('berapa order')) &&
    !q.includes('hari ini') && !q.includes('selesai') && !q.includes('belum')
  ) {
    directAnswer = `Berdasarkan data database saat ini, total terdapat **${totalOrders} pesanan servis** yang terdaftar di AD Computer:\n\n` +
      `📊 **Rincian Berdasarkan Status:**\n` +
      `${statusSummary}\n\n` +
      `• **Pesanan Belum Selesai**: ${unfinishedCount} order\n` +
      `• **Pesanan Sudah Selesai**: ${finishedCount} order\n\n` +
      `Buka menu [Orders](/admin/orders) untuk manajemen pesanan selengkapnya.`;
  }

  // L. Berapa jumlah pesanan hari ini
  else if (
    q.includes('hari ini') &&
    (q.includes('pesanan') || q.includes('order') || q.includes('berapa'))
  ) {
    directAnswer = `Berdasarkan data database saat ini, terdapat **${todayOrdersCount} pesanan servis baru yang masuk hari ini**.\n\n` +
      `Total seluruh pesanan aktif saat ini adalah **${totalOrders} order** (${unfinishedCount} belum selesai).`;
  }

  // M. Ringkasan pesanan servis / Ringkasan umum
  else if (
    q.includes('ringkasan') ||
    q.includes('rekap') ||
    q.includes('statistik') ||
    q.includes('overview')
  ) {
    directAnswer = `**Ringkasan Database AD Computer (Admin):**\n\n` +
      `📊 **Total Service Order**: ${totalOrders} order\n` +
      `• Belum Selesai: ${unfinishedCount} order\n` +
      `• Selesai: ${finishedCount} order\n` +
      `• Masuk Hari Ini: ${todayOrdersCount} order\n\n` +
      `🛠️ **Status Breakdown:**\n` +
      `${statusSummary}\n\n` +
      `💰 **Ringkasan Pembayaran:**\n` +
      `${paySummary}\n\n` +
      `🕒 **Order Terbaru:**\n` +
      `${recentList}\n\n` +
      `Ketikkan nomor tiket spesifik (contoh: *${recentOrders[0]?.ticketNumber || 'SRV-2026-001'}*) untuk melihat rincian diagnosa teknisi dan quotation.`;
  }

  // N. Panduan penggunaan dashboard Admin
  else if (
    (q.includes('panduan') || q.includes('cara pakai') || q.includes('cara menggunakan') || q.includes('menu apa')) &&
    (q.includes('dashboard') || q.includes('admin') || q.includes('website'))
  ) {
    directAnswer = `**Panduan Modul Dashboard Admin AD Computer:**\n\n` +
      `1. 📊 **Dashboard (/admin/dashboard)**: Melihat metrik performa utama, grafik pesanan, pendapatan servis, dan status antrean.\n` +
      `2. 📦 **Orders (/admin/orders)**: Mengelola seluruh tiket servis masuk, mengubah status pengerjaan, dan menambahkan catatan admin untuk customer (WhatsApp).\n` +
      `3. 🩺 **Diagnosis Modal**: Menginput hasil diagnosa fisik/komponen, rekomendasi pengerjaan teknisi, dan estimasi biaya.\n` +
      `4. 📄 **Quotations (/admin/quotations)**: Menerbitkan surat penawaran biaya resmi berisi rincian jasa & sparepart untuk disetujui customer.\n` +
      `5. 💳 **Payments (/admin/payments)**: Mencatat transaksi pembayaran customer (BCA VA, QRIS, Tunai, Transfer Bank).\n` +
      `6. 👥 **Customers (/admin/customers)**: Melihat daftar pelanggan terdaftar, riwayat servis mereka, dan kontak WhatsApp.\n` +
      `7. 📚 **Knowledge Base (/admin/knowledge-base)**: Mengelola artikel SOP, kebijakan garansi, dan FAQ yang menjadi sumber pengetahuan AI Assistant.`;
  }

  return {
    contextText: contextParts.join('\n\n'),
    directAnswer,
    showWhatsApp: false,
  };
}
