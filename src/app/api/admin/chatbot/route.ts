import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { APP_CONFIG } from '@/lib/config';
import {
  getAdminDatabaseContext,
  UserSessionContext,
} from '@/lib/ai-database-context';
import { getBusinessKnowledge } from '@/lib/ai-knowledge';
import { buildFallbackReply } from '@/lib/ai-fallback';
import {
  generateChatCompletion,
  describeAiError,
  describeUnknownError,
  type ChatMessage,
} from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HISTORY_LIMIT = 10;
const MAX_USER_MESSAGE_CHARS = 4000;

function reply(content: string, model?: string) {
  return NextResponse.json({
    choices: [{ message: { role: 'assistant', content, model } }],
    model,
  });
}

function buildAdminSystemPrompt(params: {
  adminName: string;
  adminEmail: string;
  knowledgeText: string;
  adminContext: string;
}): string {
  const { adminName, adminEmail, knowledgeText, adminContext } = params;

  return `Anda adalah "AI Assistant ${APP_CONFIG.name}" untuk Administrator sistem internal.
Pengguna: ${adminName} (${adminEmail}) — Role: ADMIN TERVERIFIKASI.

=== IDENTITAS RESMI ===
Jika ditanya "siapa kamu" atau meminta perkenalan, perkenalkan diri sebagai:
"Saya adalah AI Assistant AD Computer, asisten virtual resmi AD Computer yang siap membantu Anda dalam mengelola operasional servis, memantau ringkasan pesanan, diagnosa teknisi, serta navigasi dashboard Admin."

=== STRUKTUR ROLE WEBSITE ===
Website AD Computer memiliki 3 jenis role:
1. Admin: Bertugas mengelola website dan pesanan servis.
2. Customer: Menggunakan layanan website untuk perbaikan dan booking.
3. AI Assistant: Asisten virtual cerdas yang tersedia di website untuk menjawab pertanyaan dan memberikan informasi secara otomatis (BUKAN akun pengguna manusia di tabel database).

${knowledgeText}

=== DATA OPERASIONAL DARI DATABASE (HANYA UNTUK ADMIN) ===
${adminContext}
=== AKHIR DATA OPERASIONAL ===

PANDUAN OPERASIONAL ADMIN:
1. Jawab berdasarkan data aktual database di atas secara akurat, spesifik, dan ringkas. Jangan mengarang angka atau status.
2. Jika ditanya "Ada berapa user di website ini?":
   Jelaskan bahwa website AD Computer memiliki 3 jenis role (Admin, Customer, AI Assistant) dan tugas masing-masing, serta sebutkan jumlah akun terdaftar aktual di database berdasarkan data di atas.
3. Jika ditanya jumlah pesanan (belum selesai, selesai, sedang dikerjakan, hari ini, dll):
   Gunakan angka aktual dari data database di atas.
4. Anda boleh membantu analisa diagnosa kerusakan, rekomendasi pengerjaan, ringkasan order, dan draft balasan ke customer.
5. DILARANG mengubah data (insert/update/delete) lewat obrolan. Perubahan hanya melalui modul/form resmi.
6. Jangan menampilkan password, token, API key, atau rahasia autentikasi.
7. Jangan menuliskan kode program.
8. Pahami pertanyaan lanjutan dari riwayat percakapan.
9. Untuk pertanyaan tentang customer (daftar, jumlah, customer terbaru, pencarian nama, customer yang pernah servis, atau riwayat transaksi), gunakan DATA CUSTOMER dari database di atas. Jangan mengarang nama, tanggal, atau jumlah.
10. Tampilkan hanya informasi customer yang diperlukan: nama, tanggal daftar, jumlah/riwayat servis. Jangan membocorkan password, token, API key, atau data sensitif. Nomor WhatsApp/email customer hanya boleh disebut jika benar-benar diperlukan dan tersedia pada data.
11. Jika data customer tidak tersedia atau gagal dimuat, katakan dengan jujur bahwa data belum dapat dimuat. Jangan mengarang daftar customer.`;
}

function buildHistory(messages: any[], userQuery: string): ChatMessage[] {
  const cleaned: ChatMessage[] = [];

  for (const raw of messages.slice(-HISTORY_LIMIT)) {
    if (!raw || typeof raw.content !== 'string') continue;
    const content = raw.content.trim();
    if (!content) continue;
    cleaned.push({
      role: raw.role === 'assistant' ? 'assistant' : 'user',
      content: content.slice(0, MAX_USER_MESSAGE_CHARS),
    });
  }

  const last = cleaned[cleaned.length - 1];
  if (!last || last.role !== 'user' || last.content !== userQuery) {
    cleaned.push({ role: 'user', content: userQuery });
  }

  return cleaned;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  // ── Autentikasi & otorisasi (tidak boleh percaya input frontend) ─────────
  let payload;
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Tidak terotorisasi. Silakan login sebagai Admin.' },
        { status: 401 }
      );
    }

    payload = await verifyJWT(token);
  } catch (error) {
    console.warn('[ADMIN_CHAT_AUTH_WARN]', describeUnknownError(error));
    return NextResponse.json({ error: 'Sesi tidak valid. Silakan login ulang.' }, { status: 401 });
  }

  if (!payload || payload.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Akses ditolak. Fitur ini khusus Admin terotorisasi.' },
      { status: 403 }
    );
  }

  // ── Validasi input ───────────────────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  }

  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Pesan percakapan diperlukan.' }, { status: 400 });
  }

  const lastUserMsg = [...messages].reverse().find((m: any) => m?.role === 'user');
  const userQuery = lastUserMsg ? String(lastUserMsg.content).trim() : '';

  if (!userQuery) {
    return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
  }

  if (userQuery.length > MAX_USER_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Pesan terlalu panjang (maksimal ${MAX_USER_MESSAGE_CHARS} karakter).` },
      { status: 400 }
    );
  }

  const adminSession: UserSessionContext = {
    userId: payload.userId,
    email: payload.email,
    name: payload.name || 'Admin',
    role: 'ADMIN',
  };

  // ── Konteks operasional admin (order, tiket, statistik, profil) ──────────
  let adminContext = '';
  try {
    const dbResult = await getAdminDatabaseContext(adminSession, userQuery);
    adminContext = dbResult.contextText || '';

    if (dbResult.directAnswer) {
      console.log(`[ADMIN_CHAT_DB_DIRECT] answered in ${Date.now() - startedAt}ms`);
      return reply(dbResult.directAnswer, 'database');
    }
  } catch (error) {
    console.error('[ADMIN_CHAT_DB_ERROR]', describeUnknownError(error));
    return NextResponse.json(
      {
        choices: [
          {
            message: {
              role: 'assistant',
              content:
                'Maaf, data operasional sedang tidak dapat diakses (gangguan database). ' +
                'Silakan coba beberapa saat lagi atau periksa koneksi database server.',
            },
          },
        ],
        model: 'database-error',
      },
      { status: 200 }
    );
  }

  const knowledge = await getBusinessKnowledge();

  const systemPrompt = buildAdminSystemPrompt({
    adminName: adminSession.name,
    adminEmail: adminSession.email,
    knowledgeText: knowledge.contextText,
    adminContext,
  });

  const history = buildHistory(messages, userQuery);
  const aiMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  try {
    const completion = await generateChatCompletion(aiMessages, {
      temperature: 0.4,
      maxTokens: 700,
      timeoutMs: 40_000,
      perModelTimeoutMs: 22_000,
    });

    console.log(
      `[ADMIN_CHAT_OK] model=${completion.model} total=${Date.now() - startedAt}ms ai=${completion.latencyMs}ms attempts=${completion.attempts}`
    );

    return reply(completion.content, completion.model);
  } catch (error) {
    const info = describeAiError(error);
    console.error(
      `[ADMIN_CHAT_AI_FAILED] kind=${info.kind} detail=${info.log} after=${Date.now() - startedAt}ms`
    );

    // Fallback admin: tampilkan data operasional yang sudah terverifikasi.
    const fallback = adminContext
      ? `Asisten AI sedang lambat merespons. Berikut data sistem terkait permintaan Anda:\n\n${adminContext}\n\n*Gunakan modul Admin untuk aksi perubahan data.*`
      : buildFallbackReply(knowledge, userQuery, info.kind);

    return reply(fallback, 'fallback');
  }
}
