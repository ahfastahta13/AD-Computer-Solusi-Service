/**
 * System Configuration Service (server-only).
 *
 * Mengumpulkan informasi konfigurasi AKTUAL project dan menjalankan
 * pemeriksaan koneksi nyata untuk AI, WhatsApp Fonnte, Telegram, dan Database.
 *
 * Prinsip keamanan:
 * - Nilai secret asli TIDAK PERNAH dikembalikan ke frontend.
 * - Hanya masked value, nama environment variable, dan status yang dikirim.
 * - Tidak ada pesan WhatsApp/Telegram yang dikirim saat pemeriksaan.
 */

import { prisma } from '@/lib/db';
import { signJWT, verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import {
  AI_KEY_ENV_VAR,
  AI_MODEL_ENV_VAR,
  AI_PROVIDER_NAME,
  checkAiConnection,
  getAiKeyInfo,
  getAiModelChain,
} from '@/lib/ai-provider';
import { FONNTE_TOKEN_ENV_VAR, checkFonnteDevice } from '@/lib/fonnte';
import { checkTelegramConnection, isTelegramConfigured } from '@/lib/telegram';
import {
  getAdminWhatsAppRecipient,
  getWhatsAppProvider,
  isWhatsAppConfigured,
  isWhatsAppNotifyAdminEnabled,
  isWhatsAppNotifyCustomerEnabled,
} from '@/lib/whatsapp-notification';
import { maskIdentifier, maskSecret } from '@/lib/secret-utils';

export type ServiceStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'NOT_CONFIGURED'
  | 'ERROR';

export type ConfigService = 'ai' | 'fonnte' | 'telegram' | 'database';

export type CheckDetails = Record<string, string | number | boolean | null>;

export interface ServiceCheckResult {
  service: ConfigService;
  status: ServiceStatus;
  ok: boolean;
  latencyMs: number;
  checkedAt: string;
  message: string;
  details: CheckDetails;
}

interface DatabaseInfo {
  type: string;
  name: string | null;
}

interface UserCounts {
  admin: number;
  customer: number;
  total: number;
}

/** Ambil jenis & nama database tanpa membocorkan connection string. */
function getDatabaseInfo(): DatabaseInfo {
  const url = (process.env.DATABASE_URL || '').trim();
  if (!url) return { type: 'Tidak diketahui', name: null };

  if (url.startsWith('file:')) {
    const rawPath = url.slice(5).split('?')[0];
    const name = rawPath.split(/[\\/]/).filter(Boolean).pop() || null;
    return { type: 'SQLite', name };
  }

  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').filter(Boolean).pop() || null;
    return { type: parsed.protocol.replace(':', '').toUpperCase(), name };
  } catch {
    return { type: 'Tidak diketahui', name: null };
  }
}

async function checkDatabaseConnection(): Promise<{
  ok: boolean;
  latencyMs: number;
  counts: UserCounts;
  error?: string;
}> {
  const startedAt = Date.now();
  try {
    const [total, admin, customer] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      counts: { total, admin, customer },
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      counts: { total: 0, admin: 0, customer: 0 },
      error: 'Koneksi database gagal.',
    };
  }
}

/** Jalankan pemeriksaan nyata untuk satu layanan. */
export async function runServiceCheck(service: ConfigService): Promise<ServiceCheckResult> {
  const checkedAt = new Date().toISOString();

  if (service === 'ai') {
    const keyInfo = getAiKeyInfo();
    const models = getAiModelChain();
    const check = await checkAiConnection();
    const primaryModel = models[0] || '-';

    let status: ServiceStatus = 'ERROR';
    let message = check.error || 'Gagal memeriksa provider AI.';

    if (!keyInfo.configured) {
      status = 'NOT_CONFIGURED';
      message = 'API key AI belum dikonfigurasi.';
    } else if (check.ok) {
      if (check.primaryModelAvailable === false) {
        status = 'ERROR';
        message = `API key valid, tetapi model utama (${primaryModel}) tidak tersedia di provider.`;
      } else {
        status = 'CONNECTED';
        message = `Terhubung ke ${AI_PROVIDER_NAME} (${check.modelsAvailable ?? '?'} model tersedia).`;
      }
    }

    return {
      service,
      status,
      ok: status === 'CONNECTED',
      latencyMs: check.latencyMs,
      checkedAt,
      message,
      details: {
        provider: AI_PROVIDER_NAME,
        primaryModel,
        primaryModelAvailable: check.primaryModelAvailable ?? null,
        modelsAvailable: check.modelsAvailable ?? null,
        keySource: keyInfo.source,
        httpStatus: check.httpStatus,
      },
    };
  }

  if (service === 'fonnte') {
    const check = await checkFonnteDevice();

    let status: ServiceStatus = 'ERROR';
    let message = check.error || 'Gagal memeriksa device Fonnte.';

    if (!check.configured) {
      status = 'NOT_CONFIGURED';
    } else if (check.connected) {
      status = 'CONNECTED';
      message = 'Device WhatsApp Fonnte terhubung.';
    } else if (check.statusRaw === 'true' && check.deviceStatus) {
      status = 'DISCONNECTED';
    }

    return {
      service,
      status,
      ok: status === 'CONNECTED',
      latencyMs: check.latencyMs,
      checkedAt,
      message,
      details: {
        deviceStatus: check.deviceStatus ?? null,
        deviceNumber: check.deviceNumber ?? null,
        deviceName: check.deviceName ?? null,
        quota: check.quota ?? null,
        package: check.packageName ?? null,
        expired: check.expired ?? null,
        httpStatus: check.httpStatus,
      },
    };
  }

  if (service === 'telegram') {
    const configured = isTelegramConfigured();
    const check = await checkTelegramConnection();

    let status: ServiceStatus = 'ERROR';
    let message = check.error || 'Gagal memeriksa Telegram.';

    if (!configured) {
      status = 'NOT_CONFIGURED';
      message = 'Bot token atau Chat ID belum dikonfigurasi.';
    } else if (check.ok) {
      status = 'CONNECTED';
      message = 'Bot Telegram dan Chat ID dapat diakses.';
    }

    return {
      service,
      status,
      ok: status === 'CONNECTED',
      latencyMs: check.latencyMs,
      checkedAt,
      message,
      details: {
        botUsername: check.botUsername ?? null,
        chatType: check.chatType ?? null,
        chatName: check.chatName ?? null,
        httpStatus: check.httpStatus,
      },
    };
  }

  // database
  const dbInfo = getDatabaseInfo();
  const dbCheck = await checkDatabaseConnection();

  return {
    service: 'database',
    status: dbCheck.ok ? 'CONNECTED' : 'ERROR',
    ok: dbCheck.ok,
    latencyMs: dbCheck.latencyMs,
    checkedAt,
    message: dbCheck.ok
      ? 'Koneksi database berhasil.'
      : dbCheck.error || 'Koneksi database gagal.',
    details: {
      type: dbInfo.type,
      name: dbInfo.name,
      adminCount: dbCheck.counts.admin,
      customerCount: dbCheck.counts.customer,
      totalUsers: dbCheck.counts.total,
    },
  };
}

/** Snapshot lengkap konfigurasi + status pemeriksaan aktual. */
export async function getSystemConfigSnapshot() {
  const aiKey = getAiKeyInfo();
  const aiModels = getAiModelChain();
  const waProvider = getWhatsAppProvider();
  const waToken = (process.env.WHATSAPP_API_TOKEN || '').trim();
  const waConfigured = isWhatsAppConfigured();
  const waRecipient = getAdminWhatsAppRecipient();
  const telegramConfigured = isTelegramConfigured();
  const telegramToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const telegramChatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  const dbInfo = getDatabaseInfo();
  const jwtEnvConfigured = Boolean((process.env.JWT_SECRET || '').trim());

  const [aiCheck, fonnteCheck, telegramCheck, dbCheck] = await Promise.all([
    runServiceCheck('ai'),
    runServiceCheck('fonnte'),
    runServiceCheck('telegram'),
    runServiceCheck('database'),
  ]);

  // Pemeriksaan fungsional autentikasi: sign & verify JWT (tanpa membuat sesi).
  let authFunctional = false;
  try {
    const probeToken = await signJWT(
      {
        userId: 'system-config-check',
        email: 'system-config-check@local',
        role: 'ADMIN',
        name: 'System Config Check',
      },
      '1m'
    );
    const payload = await verifyJWT(probeToken);
    authFunctional = payload?.userId === 'system-config-check';
  } catch {
    authFunctional = false;
  }

  const authStatus: ServiceStatus =
    authFunctional && dbCheck.ok && Number(dbCheck.details.adminCount || 0) > 0
      ? 'CONNECTED'
      : 'ERROR';

  return {
    checkedAt: new Date().toISOString(),
    ai: {
      provider: AI_PROVIDER_NAME,
      primaryModel: aiModels[0] || '-',
      models: aiModels,
      keyConfigured: aiKey.configured,
      keySource: aiKey.source,
      maskedKey: aiKey.maskedKey,
      envKey: AI_KEY_ENV_VAR,
      envModel: AI_MODEL_ENV_VAR,
      check: aiCheck,
    },
    whatsapp: {
      provider: waProvider,
      configured: waConfigured,
      maskedToken: maskSecret(waToken),
      envToken: FONNTE_TOKEN_ENV_VAR,
      adminRecipient: waRecipient || null,
      notifyAdmin: isWhatsAppNotifyAdminEnabled(),
      notifyCustomer: isWhatsAppNotifyCustomerEnabled(),
      check: fonnteCheck,
    },
    telegram: {
      configured: telegramConfigured,
      maskedToken: maskSecret(telegramToken),
      maskedChatId: maskIdentifier(telegramChatId),
      envToken: 'TELEGRAM_BOT_TOKEN',
      envChatId: 'TELEGRAM_CHAT_ID',
      check: telegramCheck,
    },
    database: {
      type: dbInfo.type,
      name: dbInfo.name,
      envVar: 'DATABASE_URL',
      check: dbCheck,
    },
    auth: {
      status: authStatus,
      functional: authFunctional,
      jwtEnvVar: 'JWT_SECRET',
      jwtEnvConfigured,
      secretSource: jwtEnvConfigured ? 'environment' : 'project-fallback',
      cookieName: COOKIE_NAME,
      adminCount: Number(dbCheck.details.adminCount || 0),
      customerCount: Number(dbCheck.details.customerCount || 0),
      totalUsers: Number(dbCheck.details.totalUsers || 0),
      checkedAt: dbCheck.checkedAt,
    },
  };
}
