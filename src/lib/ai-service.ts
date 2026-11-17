// =============================================================================
// AI Service Abstraction Layer
// Mendukung: Google Gemini, OpenAI, atau Mock (fallback)
// Provider dipilih via env variable AI_PROVIDER
// API key TIDAK PERNAH dikirim ke frontend — hanya digunakan di server-side
// =============================================================================

import { prisma } from '@/lib/db';
import { generateChatCompletion } from '@/lib/ai-provider';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIServiceOptions {
  systemPrompt: string;
  history?: AIMessage[];
  temperature?: number;
}

export interface AIResponse {
  content: string;
  provider: string;
  error?: string;
}

// --------------------------------------------------------------------------
// Database Schema — Full DB Mastery for AI
// --------------------------------------------------------------------------
export function getDatabaseSchema(): string {
  return `
DATABASE SCHEMA (SQLite via Prisma ORM):
==========================================

1. USERS TABLE (users)
   - id: String (PK, cuid)
   - name: String
   - email: String (unique)
   - phone: String (optional)
   - password: String (optional, hashed)
   - address: String (optional)
   - role: String (CUSTOMER | ADMIN | TECHNICIAN)
   - createdAt: DateTime
   - updatedAt: DateTime

2. SERVICES TABLE (services)
   - id: String (PK, cuid)
   - name: String
   - description: String
   - category: String (Hardware Repair, Hardware Upgrade, OS & Software, Network, Data Recovery)
   - priceFrom: Float
   - estimatedDuration: String
   - isActive: Boolean
   - createdAt: DateTime
   - updatedAt: DateTime

3. SERVICE_ORDERS TABLE (service_orders)
   - id: String (PK, cuid)
   - ticketNumber: String (unique)
   - customerId: String (FK -> users.id)
   - serviceId: String (FK -> services.id, optional)
   - problemDescription: String
   - deviceType: String (Laptop, PC Desktop, Server/Network, Printer/Peripheral)
   - deviceBrand: String
   - deviceModel: String
   - attachment: String (optional)
   - serviceType: String (onsite | workshop)
   - address: String (optional)
   - preferredSchedule: DateTime (optional)
   - status: String (PENDING, DIAGNOSING, QUOTED, IN_REPAIR, READY_FOR_PICKUP, COMPLETED, CANCELLED)
   - createdAt: DateTime
   - updatedAt: DateTime

4. DIAGNOSES TABLE (diagnoses)
   - id: String (PK, cuid)
   - serviceOrderId: String (FK -> service_orders.id, unique)
   - diagnosis: String
   - recommendation: String
   - estimatedCost: Float
   - createdAt: DateTime
   - updatedAt: DateTime

5. QUOTATIONS TABLE (quotations)
   - id: String (PK, cuid)
   - serviceOrderId: String (FK -> service_orders.id, unique)
   - quotationNumber: String (unique)
   - subtotal: Float
   - discount: Float
   - total: Float
   - notes: String (optional)
   - status: String (DRAFT, SENT, APPROVED, REJECTED)
   - approvedAt: DateTime (optional)
   - createdAt: DateTime
   - updatedAt: DateTime

6. QUOTATION_ITEMS TABLE (quotation_items)
   - id: String (PK, cuid)
   - quotationId: String (FK -> quotations.id)
   - description: String
   - quantity: Int
   - unitPrice: Float
   - subtotal: Float

7. PAYMENTS TABLE (payments)
   - id: String (PK, cuid)
   - serviceOrderId: String (FK -> service_orders.id)
   - amount: Float
   - paymentMethod: String (BCA_VA, QRIS, CASH, BANK_TRANSFER)
   - paymentStatus: String (UNPAID, PENDING_VERIFICATION, PAID, REFUNDED)
   - paymentDate: DateTime (optional)
   - proofAttachment: String (optional)
   - notes: String (optional)
   - createdAt: DateTime
   - updatedAt: DateTime

8. NOTIFICATIONS TABLE (notifications)
   - id: String (PK, cuid)
   - userId: String (FK -> users.id)
   - title: String
   - message: String
   - type: String (ORDER_STATUS, QUOTATION_READY, PAYMENT_CONFIRMED, SYSTEM)
   - isRead: Boolean
   - createdAt: DateTime

9. KNOWLEDGE_BASE TABLE (knowledge_base)
   - id: String (PK, cuid)
   - category: String (FAQ, POLICY, SOP, PRICING, TROUBLESHOOTING)
   - title: String
   - content: String
   - isActive: Boolean
   - createdAt: DateTime
   - updatedAt: DateTime

RELATIONSHIPS:
- User 1:N ServiceOrder (customer)
- User 1:N Notification
- Service 1:N ServiceOrder
- ServiceOrder 1:1 Diagnosis
- ServiceOrder 1:1 Quotation
- ServiceOrder 1:N Payment
- Quotation 1:N QuotationItem
`;
}

// --------------------------------------------------------------------------
// Business Knowledge Base — Hardcoded defaults + DB Integration
// --------------------------------------------------------------------------
export function getBusinessKnowledge() {
  return {
    company: {
      name: 'IT Service Business System',
      phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '+62 856-2429-9894',
      email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'support@itservice-system.com',
      address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Jalan Kapten Samadikun 10. RT 02/RW 10, No.022, Kota Cirebon, Jawa Barat',
      workingHours: 'Senin - Sabtu: 09.00 - 18.00 WIB',
    },
    disclaimer: 'ℹ️ **Disclaimer:** Analisa ini merupakan bantuan awal dari AI berdasarkan informasi yang diberikan. Diagnosis final dan keputusan teknis dilakukan oleh teknisi berlisensi kami. Harga bersifat estimasi dan dapat berubah setelah pemeriksaan langsung.',
  };
}

// --------------------------------------------------------------------------
// Helper: Fetch Knowledge Base from DB
// --------------------------------------------------------------------------
async function getDynamicKnowledgeBase(): Promise<string> {
  try {
    const items = await prisma.knowledgeBase.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });

    if (items.length === 0) return '';

    const grouped = items.reduce((acc: any, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(`- ${item.title}: ${item.content}`);
      return acc;
    }, {});

    let kbString = '\n\nINFORMASI BUSINESS KNOWLEDGE BASE TAMBAHAN (Gunakan informasi ini jika relevan):\n';
    for (const [category, entries] of Object.entries(grouped)) {
      kbString += `\n[Kategori: ${category}]\n${(entries as string[]).join('\n')}\n`;
    }

    console.log('[AI-KB] Knowledge base loaded:', items.length, 'items, length:', kbString.length);
    return kbString;
  } catch (err) {
    console.error('[AI-KB] Failed to fetch knowledge base from DB:', err);
    return ''; // Fail silently to not break the AI chat if DB read fails
  }
}

// --------------------------------------------------------------------------
// Helper: Fetch Services from DB
// --------------------------------------------------------------------------
async function getActiveServices(): Promise<any[]> {
  try {
    return await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  } catch {
    return [];
  }
}

// --------------------------------------------------------------------------
// System Prompts (NOW ASYNC)
// --------------------------------------------------------------------------
export async function buildCustomerSystemPrompt(): Promise<string> {
  const services = await getActiveServices();
  const serviceList = services
    .map((s) => `- ${s.name} (mulai Rp ${s.priceFrom.toLocaleString('id-ID')}, estimasi ${s.estimatedDuration}) - ${s.description}`)
    .join('\n');

  const dynamicKB = await getDynamicKnowledgeBase();

  const bk = getBusinessKnowledge();
  const dbSchema = getDatabaseSchema();
  return `Anda adalah AI IT Assistant untuk "${bk.company.name}".

PERAN ANDA:
- Membantu customer melakukan troubleshooting awal perangkat komputer/laptop/jaringan.
- Merekomendasikan layanan yang sesuai berdasarkan keluhan.
- Menjawab pertanyaan umum (FAQ) tentang bisnis.
- Jika masalah membutuhkan teknisi, arahkan untuk membuat booking.
- Menguasai seluruh struktur database sistem untuk memberikan informasi yang akurat.

LAYANAN YANG TERSEDIA (HANYA REKOMENDASIKAN LAYANAN INI):
${serviceList}

${dbSchema}

=== KNOWLEDGE BASE (WAJIB DIGUNAKAN) ===
${dynamicKB}
=== AKHIR KNOWLEDGE BASE ===

ATURAN KETAT:
1. WAJIB: Selalu periksa KNOWLEDGE BASE di atas sebelum menjawab. Jika ada informasi yang relevan di knowledge base, GUNAKAN ITU sebagai jawaban utama.
2. Prioritas jawaban: KNOWLEDGE BASE > daftar LAYANAN > pengetahuan umum.
3. JANGAN mengarang harga, garansi, atau kebijakan yang tidak ada di knowledge base.
4. Jika informasi yang ditanyakan belum tersedia di knowledge base, katakan: "Mohon maaf, informasi tersebut belum tersedia dalam knowledge base bisnis kami saat ini. Silakan hubungi kami langsung di ${bk.company.phone} atau ${bk.company.email}"
5. Selalu akhiri analisa dengan disclaimer tentang diagnosis akhir oleh teknisi.
6. Gunakan Bahasa Indonesia yang ramah, jelas, dan mudah dipahami orang awam.
7. Tanya informasi yang relevan jika customer tidak memberikan detail cukup.
8. Jika masalah jelas butuh teknisi, rekomendasikan booking dengan antusias.
9. KEAMANAN — LARANGAN KODE:
   • DILARANG KERAS membuat, menulis, menampilkan, atau menjelaskan KODE PROGRAM (Python, JavaScript, C++, Java, SQL, HTML, CSS, Bash, PowerShell, dll).
   • DILARANG memberikan script, snippet, algoritma, fungsi, class, atau sintaks pemrograman dalam bentuk apapun.
   • Jika user meminta coding/programming: TOLAK dengan sopan → "Maaf, saya hanya membantu troubleshooting IT, servis komputer, dan konsultasi teknis. Saya tidak bisa membuat kode program."
   • Fokus HANYA pada: diagnosis kerusakan, rekomendasi servis, informasi layanan, dan pertanyaan teknis non-coding.
10. DATABASE: Anda memiliki akses ke seluruh schema database sistem. Gunakan informasi ini untuk memberikan jawaban yang akurat tentang struktur data, relasi antar tabel, dan kapabilitas sistem.
11. QUERY DATABASE: Anda dapat query database secara read-only melalui endpoint /api/ai/query. Gunakan ini untuk mendapatkan data real-time dari tabel: users, services, service_orders, diagnoses, quotations, quotation_items, payments, notifications, knowledge_base. Selalu gunakan parameter yang tepat (table, action, filters, limit).

KONTAK BISNIS:
- Telepon/WhatsApp: ${bk.company.phone}
- Email: ${bk.company.email}
- Alamat: ${bk.company.address}
- Jam Operasional: ${bk.company.workingHours}`;
}

export async function buildAdminSystemPrompt(): Promise<string> {
  const services = await getActiveServices();
  const serviceList = services
    .map((s) => `- ${s.name}: ${s.description}`)
    .join('\n');

  const dynamicKB = await getDynamicKnowledgeBase();

  const bk = getBusinessKnowledge();
  const dbSchema = getDatabaseSchema();
  return `Anda adalah AI Diagnostic Assistant untuk teknisi di "${bk.company.name}".

PERAN ANDA:
- Membantu admin/teknisi melakukan analisa diagnosis awal berdasarkan gejala yang dilaporkan.
- Menghasilkan draft laporan diagnosis teknis yang terstruktur.
- Menyarankan pertanyaan lanjutan yang perlu ditanyakan ke customer.
- Menguasai seluruh struktur database sistem untuk memberikan informasi yang akurat.

LAYANAN YANG TERSEDIA:
${serviceList}
${dynamicKB}

${dbSchema}

FORMAT RESPONS ANDA (gunakan format ini):
## 🔍 Analisa Gejala
[Ringkasan gejala yang dilaporkan]

## ⚠️ Kemungkinan Penyebab
1. [Penyebab paling mungkin]
2. [Penyebab alternatif]
3. [Penyebab lain jika ada]

## 🔧 Langkah Troubleshooting yang Disarankan
1. [Langkah pertama]
2. [Langkah kedua]
...

## 📋 Draft Diagnosis untuk Laporan
[Draft teks diagnosis yang bisa langsung digunakan admin]

## ❓ Pertanyaan Lanjutan untuk Customer
- [Pertanyaan 1]
- [Pertanyaan 2]

## 🛠️ Layanan yang Direkomendasikan
[Nama layanan dari daftar yang tersedia]

## ⚡ Tingkat Urgensi
[Rendah / Sedang / Tinggi / Kritis] — [Alasan]

ATURAN:
1. Berikan analisa teknis yang detail dan akurat.
2. JANGAN mengarang harga atau waktu pengerjaan spesifik, selalu merujuk pada KNOWLEDGE BASE atau SERVICES list jika ada.
3. Gunakan terminologi teknis yang tepat.
4. Selalu ingatkan bahwa ini adalah analisa awal, pengecekan fisik tetap diperlukan.
5. Gunakan Bahasa Indonesia yang teknis namun mudah dipahami.
6. KEAMANAN — LARANGAN KODE:
   • DILARANG KERAS membuat, menulis, menampilkan, atau menjelaskan KODE PROGRAM (Python, JavaScript, C++, Java, SQL, HTML, CSS, Bash, PowerShell, dll).
   • DILARANG memberikan script, snippet, algoritma, fungsi, class, atau sintaks pemrograman dalam bentuk apapun.
   • Jika user meminta coding/programming: TOLAK dengan sopan → "Maaf, saya hanya membantu diagnosis IT dan analisa kerusakan. Saya tidak bisa membuat kode program."
   • Fokus HANYA pada: diagnosis kerusakan, rekomendasi servis, analisa teknis, dan pertanyaan non-coding.`;
}

// --------------------------------------------------------------------------
// Gemini Provider
// --------------------------------------------------------------------------
async function callGemini(
  message: string,
  history: AIMessage[],
  systemPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY tidak dikonfigurasi di .env');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
      maxOutputTokens: 1024,
    },
  });

  const geminiHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(message);
  return result.response.text();
}

// --------------------------------------------------------------------------
// Mock Provider (fallback / demo)
// --------------------------------------------------------------------------
function callMock(message: string): string {
  return `**Analisa Mock AI:** (Sistem sedang dalam mode MOCK karena GEMINI_API_KEY belum diset). 
  
Silakan aktifkan Gemini dengan memasukkan API Key di .env untuk mendapatkan integrasi Knowledge Base secara utuh.
  
Pesan Anda: "${message}"

---
${getBusinessKnowledge().disclaimer}`;
}

// --------------------------------------------------------------------------
// Main AI Service — Entry Point
// --------------------------------------------------------------------------
export async function getAIResponse(
  message: string,
  options: AIServiceOptions
): Promise<AIResponse> {
  const provider = process.env.AI_PROVIDER || 'mock';

  try {
    if (provider === 'gemini') {
      const content = await callGemini(
        message,
        options.history || [],
        options.systemPrompt,
        options.temperature || 0.7
      );
      return { content, provider: 'gemini' };
    }

    // NVIDIA API (default for this project)
    const nvidiaResponse = await callNvidiaAPI(
      message,
      options.history || [],
      options.systemPrompt,
      options.temperature || 0.7
    );

    // Verify if knowledge base was used
    if (options.systemPrompt.includes('KNOWLEDGE BASE')) {
      const kbUsed = verifyKnowledgeBaseUsage(nvidiaResponse, options.systemPrompt);
      console.log('[AI-VERIFY] Knowledge base used:', kbUsed);
    }

    return { content: nvidiaResponse, provider: 'nvidia' };
  } catch (error: any) {
    console.error('[AI_SERVICE_ERROR]', error);

    const content = callMock(message);
    return {
      content,
      provider: 'mock-fallback',
      error: error.message,
    };
  }
}

// Helper: Call NVIDIA API directly
async function callNvidiaAPI(
  message: string,
  history: AIMessage[],
  systemPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  // Gunakan provider terpusat (model chain + timeout + error terklasifikasi).
  const completion = await generateChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({
        role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ],
    { temperature, maxTokens: 1024, timeoutMs: 40_000, perModelTimeoutMs: 22_000 }
  );

  return completion.content;
}

// Helper: Verify if AI actually used knowledge base content
function verifyKnowledgeBaseUsage(response: string, systemPrompt: string): boolean {
  // Extract knowledge base section from system prompt
  const kbMatch = systemPrompt.match(/=== KNOWLEDGE BASE.*===\n([\s\S]*?)\n=== AKHIR KNOWLEDGE BASE ===/);
  if (!kbMatch) return false;

  const kbContent = kbMatch[1].toLowerCase();
  const responseLower = response.toLowerCase();

  // Check if any knowledge base content appears in response
  const kbLines = kbContent.split('\n').filter(line => line.trim().length > 10);
  for (const line of kbLines) {
    const keyPhrase = line.replace(/^-\s*/, '').split(':')[0].toLowerCase().trim();
    if (keyPhrase.length > 5 && responseLower.includes(keyPhrase)) {
      return true;
    }
  }
  return false;
}
