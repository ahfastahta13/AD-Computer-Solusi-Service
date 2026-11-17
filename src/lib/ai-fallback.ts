import { APP_CONFIG } from '@/lib/config';
import type { BusinessKnowledge } from '@/lib/ai-knowledge';
import { formatRupiah } from '@/lib/ai-knowledge';

/**
 * Fallback yang BERGUNA saat provider AI gagal/timeout.
 *
 * Prinsip:
 * - Tidak pernah menjawab "saya tidak bisa menjawab itu".
 * - Selalu menyajikan informasi nyata dari database/config yang relevan.
 * - Jujur bahwa jawaban detail belum bisa diproses AI saat ini.
 */

export type FallbackReason = 'timeout' | 'http' | 'network' | 'empty' | 'config' | 'unknown';

const CONTACT_LINE = `WhatsApp/Telepon: **${APP_CONFIG.company.phone}**\nAlamat: ${APP_CONFIG.company.address}\nJam operasional: ${APP_CONFIG.company.hours}`;

const SERVICE_INTENT_HINTS: Array<{ match: RegExp; targets: string[] }> = [
  { match: /(lemot|lambat|\bhang\b|\bfreeze\b|\blag\b|\bberat\b)/, targets: ['deep cleaning', 'upgrade', 'repair', 'reinstall', 'sistem operasi'] },
  { match: /(panas|overheat|kipas|thermal|bunyi)/, targets: ['deep cleaning', 'thermal', 'repasting'] },
  { match: /(\bmati\b|menyala|tidak hidup|black screen|layar hitam)/, targets: ['repair', 'motherboard', 'ic power'] },
  { match: /(instal|reinstall|windows|sistem operasi|virus|malware)/, targets: ['windows', 'reinstall', 'sistem operasi'] },
  { match: /(\bssd\b|\bram\b|upgrade|memori|penyimpanan|\bnvme\b|\bhdd\b)/, targets: ['upgrade', 'ssd', 'ram'] },
  { match: /(keyboard|\blcd\b|layar|engsel|baterai|battery)/, targets: ['repair', 'keyboard', 'lcd', 'engsel', 'baterai'] },
  { match: /(\bdata\b|hilang|terhapus|terformat|recovery|corrupt)/, targets: ['data recovery', 'storage'] },
  { match: /(jaringan|wifi|wi-?fi|\blan\b|mikrotik|router|internet)/, targets: ['jaringan', 'wifi', 'network', 'mikrotik'] },
  { match: /(cctv|kamera|\bnvr\b|\bdvr\b)/, targets: ['cctv', 'kamera'] },
  { match: /(server|cloud|konsultasi|audit|arsitektur)/, targets: ['konsultasi', 'cloud', 'arsitektur'] },
  { match: /(printer|kantor|maintenance|kontrak|helpdesk)/, targets: ['it support', 'maintenance', 'helpdesk'] },
];

/** Pencocokan kata/frasa dengan batas kata agar "ulang" tidak dianggap "lan". */
function containsTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(haystack);
}

function relevantServices(knowledge: BusinessKnowledge, q: string) {
  if (knowledge.services.length === 0) return [];

  const targets = SERVICE_INTENT_HINTS.filter((h) => h.match.test(q)).flatMap((h) => h.targets);
  if (targets.length === 0) return knowledge.services;

  const scored = knowledge.services
    .map((s) => {
      const hay = `${s.name} ${s.category} ${s.description}`.toLowerCase();
      const score = targets.reduce((acc, t) => (containsTerm(hay, t) ? acc + 1 : acc), 0);
      return { service: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.service);

  return scored.length > 0 ? scored.slice(0, 4) : knowledge.services;
}

function servicesList(knowledge: BusinessKnowledge, q: string, limit = 9): string {
  if (knowledge.services.length === 0) {
    return 'Saat ini data layanan belum tersedia di sistem. Silakan hubungi Admin untuk daftar layanan terbaru.';
  }
  const list = relevantServices(knowledge, q).slice(0, limit);
  return list
    .map((s) => `• **${s.name}** — mulai ${formatRupiah(s.priceFrom)} (${s.estimatedDuration})`)
    .join('\n');
}

function matchedKb(knowledge: BusinessKnowledge, q: string) {
  return knowledge.kb.filter((k) => {
    const hay = `${k.title} ${k.content}`.toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length >= 4);
    return words.some((w) => hay.includes(w));
  });
}

export function buildFallbackReply(
  knowledge: BusinessKnowledge,
  userQuery: string,
  reason: FallbackReason
): string {
  const q = (userQuery || '').toLowerCase();

  // Pertanyaan identitas asisten
  if (/(siapa kamu|siapa anda|kamu siapa|anda siapa|nama kamu|namamu|perkenalkan dirimu|kamu ini apa|kamu bot)/.test(q)) {
    return 'Saya adalah AI Assistant AD Computer, asisten virtual resmi AD Computer yang siap membantu Anda mendapatkan informasi layanan servis komputer dan laptop, informasi pesanan, serta bantuan lainnya.\n\nAda yang bisa saya bantu seputar servis komputer atau laptop Anda?';
  }

  // Pertanyaan struktur role website
  if (/(jenis role|macam role|apa saja role|role apa saja|role yang tersedia|daftar role|perbedaan admin|perbedaan customer)/.test(q)) {
    return 'Website **AD Computer** memiliki 3 jenis role:\n1. **Admin**: Bertugas mengelola website dan pesanan servis.\n2. **Customer**: Menggunakan layanan website untuk booking servis, konsultasi, dan pembayaran.\n3. **AI Assistant**: Asisten virtual yang membantu menjawab pertanyaan dan memberikan informasi secara otomatis (bukan akun manusia di database).';
  }

  const intro =
    reason === 'timeout'
      ? 'Asisten AI sedang lambat merespons, jadi ini ringkasan informasi resmi yang bisa saya berikan sekarang:'
      : 'Asisten AI sedang tidak dapat memproses jawaban detail, jadi ini informasi resmi yang bisa saya berikan sekarang:';

  // Kategori pertanyaan dipakai HANYA untuk memilih data yang ditampilkan,
  // bukan untuk menolak pertanyaan.
  const isPriceOrService =
    /(harga|biaya|tarif|berapa|layanan|servis|service|perbaikan|benerin|upgrade|instal|install|ssd|ram|keyboard|lcd|layar|baterai|cctv|jaringan|wifi|data)/.test(q);

  const isContact = /(lokasi|alamat|kontak|hubungi|whatsapp|wa|telepon|telpon|nomor|jam|buka|tutup|operasional)/.test(q);
  const isWarranty = /(garansi|jaminan|klaim)/.test(q);
  const isProcedure = /(cara|prosedur|alur|booking|pesan|daftar|ajukan|siapkan|bawa)/.test(q);
  const isOrder = /(order|pesanan|tiket|srv-|status servis|status service|lacak)/.test(q);
  const isIdentity = /(siapa saya|nama saya|email saya|role saya|akun saya|profil saya|login sebagai)/.test(q);

  const sections: string[] = [intro];

  if (isIdentity) {
    sections.push(
      'Untuk melihat detail akun Anda, silakan buka menu **Profil** pada dashboard, atau pastikan Anda sudah login lalu tanyakan kembali "siapa saya".'
    );
  }

  if (isOrder) {
    sections.push(
      'Untuk status servis: login lalu buka menu **Orders**, atau buka halaman **/track** dan masukkan nomor tiket (contoh: SRV-2026-001).'
    );
  }

  if (isWarranty) {
    const kb = matchedKb(knowledge, 'garansi');
    sections.push(
      kb.length > 0
        ? kb.map((k) => `📌 **${k.title}**\n${k.content}`).join('\n\n')
        : `Informasi garansi: pengerjaan teknisi bergaransi 30 hari. Detail kebijakan dapat dikonfirmasi ke Admin di ${APP_CONFIG.company.phone}.`
    );
  }

  if (isContact) {
    sections.push(`**Kontak & Lokasi AD Computer**\n${CONTACT_LINE}`);
  }

  if (isProcedure) {
    sections.push(
      `**Alur pengajuan servis**\n1. Booking melalui menu **Layanan** di website atau WhatsApp Admin.\n2. Perangkat masuk & diagnosa awal (maks. 1x24 jam kerja).\n3. Anda menerima **Quotation** resmi untuk disetujui.\n4. Perbaikan dikerjakan teknisi.\n5. Perangkat siap diambil setelah selesai.`
    );
  }

  if (isPriceOrService || (!isContact && !isWarranty && !isProcedure && !isOrder && !isIdentity)) {
    sections.push(`**Layanan & estimasi biaya (mulai dari)**\n${servicesList(knowledge, q)}`);
  }

  if (!isContact) {
    sections.push(`**Butuh bantuan langsung?**\n${CONTACT_LINE}`);
  }

  sections.push('_Catatan: harga di atas adalah estimasi awal; biaya final ditentukan setelah diagnosa teknisi._');

  return sections.join('\n\n');
}
