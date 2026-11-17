import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@/lib/config';
import { describeUnknownError } from '@/lib/ai-provider';

/**
 * Pengetahuan bisnis AD Computer yang selalu dikirim ke AI.
 *
 * Tujuan:
 * - AI tidak lagi bergantung pada keyword matching untuk tahu layanan/harga/FAQ.
 * - Data di-cache (default 60 detik) supaya tidak query database di setiap pesan.
 * - Jika database gagal, cache lama tetap dipakai (stale-while-error).
 */

export interface ServiceKnowledge {
  name: string;
  category: string;
  description: string;
  priceFrom: number;
  estimatedDuration: string;
}

export interface KbKnowledge {
  category: string;
  title: string;
  content: string;
}

export interface BusinessKnowledge {
  services: ServiceKnowledge[];
  kb: KbKnowledge[];
  contextText: string;
  fetchedAt: number;
  fromCache: boolean;
}

const CACHE_TTL_MS = 60_000;
let cache: BusinessKnowledge | null = null;
let inFlight: Promise<BusinessKnowledge> | null = null;

export function formatRupiah(amount: number): string {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
}

function buildKnowledgeText(services: ServiceKnowledge[], kb: KbKnowledge[]): string {
  const parts: string[] = [];

  parts.push(`=== PENGETAHUAN RESMI ${APP_CONFIG.name.toUpperCase()} (SUMBER KEBENARAN) ===`);

  parts.push(`[PROFIL BISNIS]
Nama: ${APP_CONFIG.name}
Alamat Workshop: ${APP_CONFIG.company.address}
WhatsApp/Telepon: ${APP_CONFIG.company.phone}
Email: ${APP_CONFIG.company.email}
Jam Operasional: ${APP_CONFIG.company.hours}
Minggu & hari libur nasional: TUTUP`);

  parts.push(`[HALAMAN & NAVIGASI WEBSITE]
- Beranda: "/" (informasi umum & layanan unggulan)
- Daftar Layanan & Harga: "/services"
- Lacak Status Servis (tanpa login, butuh nomor tiket): "/track"
- Login / Daftar Akun: "/auth/login"
- Booking Servis Baru (customer login): "/customer/services"
- Dashboard Customer: "/customer/dashboard" (menu: Services, Orders, Quotations, Payments, Profile, Notifications, AI Assistant)
- Dashboard Admin: "/admin/dashboard" (menu: Orders, Customers, Quotations, Payments, Knowledge Base, Profile)`);

  if (services.length === 0) {
    parts.push(`[KATALOG LAYANAN AKTIF]
BELUM ADA DATA LAYANAN pada database saat ini. Jangan mengarang nama layanan atau harga.`);
  } else {
    const grouped: Record<string, ServiceKnowledge[]> = {};
    for (const s of services) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    let catalog = `[KATALOG LAYANAN AKTIF] (harga = estimasi "mulai dari", bukan harga final)\n`;
    for (const [category, items] of Object.entries(grouped)) {
      catalog += `\nKategori: ${category}\n`;
      for (const s of items) {
        catalog += `- ${s.name} | Mulai ${formatRupiah(s.priceFrom)} | Durasi: ${s.estimatedDuration}\n  ${s.description}\n`;
      }
    }
    parts.push(catalog.trim());
  }

  if (kb.length === 0) {
    parts.push(`[KNOWLEDGE BASE / FAQ / KEBIJAKAN]
Belum ada entri knowledge base aktif.`);
  } else {
    let kbText = `[KNOWLEDGE BASE RESMI: FAQ, KEBIJAKAN, SOP, TROUBLESHOOTING]\n`;
    for (const k of kb) {
      kbText += `- [${k.category}] ${k.title}\n  ${k.content}\n`;
    }
    parts.push(kbText.trim());
  }

  parts.push(`=== AKHIR PENGETAHUAN RESMI ===`);
  return parts.join('\n\n');
}

async function loadKnowledge(): Promise<BusinessKnowledge> {
  try {
    const [services, kb] = await Promise.all([
      prisma.service.findMany({
        where: { isActive: true },
        select: {
          name: true,
          category: true,
          description: true,
          priceFrom: true,
          estimatedDuration: true,
        },
        orderBy: [{ category: 'asc' }, { priceFrom: 'asc' }],
      }),
      prisma.knowledgeBase.findMany({
        where: { isActive: true },
        select: { category: true, title: true, content: true },
        orderBy: [{ category: 'asc' }, { title: 'asc' }],
      }),
    ]);

    return {
      services,
      kb,
      contextText: buildKnowledgeText(services, kb),
      fetchedAt: Date.now(),
      fromCache: false,
    };
  } catch (error) {
    console.error('[AI_KNOWLEDGE_DB_ERROR]', describeUnknownError(error));

    // Sajikan cache lama agar chatbot tetap bisa menjawab saat DB bermasalah.
    if (cache) {
      return { ...cache, fromCache: true };
    }

    return {
      services: [],
      kb: [],
      contextText: buildKnowledgeText([], []),
      fetchedAt: Date.now(),
      fromCache: false,
    };
  }
}

export async function getBusinessKnowledge(forceRefresh = false): Promise<BusinessKnowledge> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache, fromCache: true };
  }
  if (!forceRefresh && inFlight) return inFlight;

  inFlight = loadKnowledge().finally(() => {
    inFlight = null;
  });

  const result = await inFlight;
  cache = result;
  return result;
}

export function invalidateBusinessKnowledge(): void {
  cache = null;
}
