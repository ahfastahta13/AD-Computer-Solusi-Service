/**
 * Provider AI NVIDIA dengan strategi fallback berlapis.
 *
 * Akar masalah sebelumnya: model `meta/llama-3.2-11b-vision-instruct`
 * sudah tidak merespons (timeout > 30 detik), sehingga hampir semua
 * pertanyaan jatuh ke fallback keyword yang sangat terbatas.
 *
 * Modul ini:
 * - Memakai model yang terbukti cepat & mendukung Bahasa Indonesia.
 * - Mencoba model berikutnya hanya jika model sebelumnya gagal/timeout.
 * - Memberi error yang bisa dibedakan (timeout / http / network / empty / config).
 */

import { maskSecret } from '@/lib/secret-utils';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /** Total anggaran waktu untuk seluruh percobaan model. */
  timeoutMs?: number;
  /** Batas waktu per model. */
  perModelTimeoutMs?: number;
}

export interface CompletionResult {
  content: string;
  model: string;
  latencyMs: number;
  attempts: number;
}

export type AiFailureKind = 'timeout' | 'http' | 'network' | 'empty' | 'config';

export class AiProviderError extends Error {
  readonly kind: AiFailureKind;
  readonly status?: number;

  constructor(kind: AiFailureKind, message: string, status?: number) {
    super(message);
    this.name = 'AiProviderError';
    this.kind = kind;
    this.status = status;
  }
}

const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODELS_URL = 'https://integrate.api.nvidia.com/v1/models';

/** Informasi provider AI yang benar-benar dipakai modul chat aktif. */
export const AI_PROVIDER_NAME = 'NVIDIA';
export const AI_KEY_ENV_VAR = 'NVIDIA_API_KEY';
export const AI_MODEL_ENV_VAR = 'AI_MODEL_CHAIN';

/**
 * Urutan model: yang pertama adalah model produksi yang sudah diuji
 * (cepat, Bahasa Indonesia baik, mengikuti data konteks).
 * Model berikutnya hanya dipakai bila model sebelumnya gagal.
 * Dapat dioverride lewat env `AI_MODEL_CHAIN` (dipisah koma) untuk operasional/testing.
 */
const MODEL_CHAIN: string[] = (
  process.env.AI_MODEL_CHAIN ||
  'nvidia/nemotron-3.5-bolt-e4b,nvidia/nemotron-3.5-lightning-30b-a3b'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const FALLBACK_API_KEY =
  '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';

function getApiKey(): string {
  // Gunakan environment variable bila tersedia; jika tidak, pakai key project yang ada.
  return (process.env.NVIDIA_API_KEY || FALLBACK_API_KEY).trim();
}

/** Salinan rantai model aktif (utama + fallback). */
export function getAiModelChain(): string[] {
  return [...MODEL_CHAIN];
}

export interface AiKeyInfo {
  configured: boolean;
  source: 'environment' | 'project-fallback' | 'none';
  envVar: string;
  maskedKey: string;
}

/**
 * Informasi API key yang sedang dipakai — TANPA nilai asli.
 * `source` memberi tahu apakah key berasal dari environment atau fallback proyek.
 */
export function getAiKeyInfo(): AiKeyInfo {
  const envKey = (process.env.NVIDIA_API_KEY || '').trim();
  const effectiveKey = getApiKey();

  return {
    configured: Boolean(effectiveKey),
    source: envKey ? 'environment' : effectiveKey ? 'project-fallback' : 'none',
    envVar: AI_KEY_ENV_VAR,
    maskedKey: maskSecret(effectiveKey),
  };
}

export interface AiConnectionCheck {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  modelsAvailable?: number;
  primaryModel: string;
  primaryModelAvailable?: boolean;
  error?: string;
}

/**
 * Pemeriksaan koneksi AI tanpa menghasilkan completion (tanpa biaya token):
 * memanggil endpoint daftar model dengan API key yang sama.
 */
export async function checkAiConnection(timeoutMs = 8000): Promise<AiConnectionCheck> {
  const startedAt = Date.now();
  const primaryModel = MODEL_CHAIN[0] || '-';
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      ok: false,
      httpStatus: null,
      latencyMs: 0,
      primaryModel,
      error: 'API key AI belum dikonfigurasi.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(MODELS_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        ok: false,
        httpStatus: response.status,
        latencyMs,
        primaryModel,
        error: `Provider AI merespons HTTP ${response.status}.`,
      };
    }

    const data: any = await response.json().catch(() => null);
    const models: Array<{ id?: string }> = Array.isArray(data?.data) ? data.data : [];
    const primaryModelAvailable =
      models.length > 0 ? models.some((model) => model?.id === primaryModel) : undefined;

    return {
      ok: true,
      httpStatus: response.status,
      latencyMs,
      modelsAvailable: models.length || undefined,
      primaryModel,
      primaryModelAvailable,
    };
  } catch (error) {
    const err = error as Error;
    const isTimeout = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    return {
      ok: false,
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
      primaryModel,
      error: isTimeout
        ? 'Koneksi ke provider AI timeout.'
        : 'Gagal menghubungi provider AI.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));
}

async function callModel(
  model: string,
  messages: ChatMessage[],
  timeoutMs: number,
  options: CompletionOptions
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 700,
        stream: false,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AiProviderError(
        'http',
        `HTTP ${response.status}${detail ? ` – ${detail.slice(0, 200)}` : ''}`,
        response.status
      );
    }

    const data: any = await response.json();
    const message = data?.choices?.[0]?.message;
    const content =
      typeof message?.content === 'string' ? message.content.trim() : '';

    if (!content) {
      const finish = data?.choices?.[0]?.finish_reason;
      throw new AiProviderError('empty', `Respons kosong (finish_reason=${finish ?? 'unknown'})`);
    }

    return content;
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    const err = error as Error;
    if (err?.name === 'AbortError') {
      throw new AiProviderError('timeout', `Timeout setelah ${timeoutMs}ms`);
    }
    throw new AiProviderError('network', err?.message || 'Gagal menghubungi provider AI');
  } finally {
    clearTimeout(timer);
  }
}

export async function generateChatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const safeMessages = sanitizeMessages(messages);
  if (safeMessages.length === 0) {
    throw new AiProviderError('config', 'Tidak ada pesan yang bisa dikirim ke AI');
  }

  const startedAt = Date.now();
  const totalBudget = options.timeoutMs ?? 40_000;
  const perModelTimeout = options.perModelTimeoutMs ?? 20_000;

  let lastError: AiProviderError | null = null;
  let attempts = 0;

  for (const model of MODEL_CHAIN) {
    const remaining = totalBudget - (Date.now() - startedAt);
    if (remaining < 1_500) break;

    attempts += 1;
    const attemptTimeout = Math.min(perModelTimeout, remaining);
    const attemptStart = Date.now();

    try {
      const content = await callModel(model, safeMessages, attemptTimeout, options);
      const latencyMs = Date.now() - startedAt;
      console.log(
        `[AI_PROVIDER_OK] model=${model} latency=${latencyMs}ms attempt=${attempts} modelLatency=${Date.now() - attemptStart}ms`
      );
      return { content, model, latencyMs, attempts };
    } catch (error) {
      const err = error as AiProviderError;
      lastError = err;
      console.warn(
        `[AI_PROVIDER_FAIL] model=${model} kind=${err.kind} status=${err.status ?? '-'} after=${Date.now() - attemptStart}ms detail=${err.message.slice(0, 180)}`
      );
    }
  }

  throw (
    lastError ??
    new AiProviderError('empty', 'Semua model AI gagal memberi respons dalam batas waktu')
  );
}

/** Untuk diagnosis/log saja — jangan diekspos ke pengguna. */
export function describeAiError(error: unknown): { kind: AiFailureKind; log: string } {
  if (error instanceof AiProviderError) {
    return { kind: error.kind, log: `${error.kind}${error.status ? `(${error.status})` : ''}: ${error.message}` };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { kind: 'network', log: message };
}

/**
 * Ringkas error apa pun untuk log server (aman: tidak memuat kredensial).
 * Prisma error terkadang tidak punya `message` yang informatif, jadi
 * kita sertakan `name` dan `code` bila ada.
 */
export function describeUnknownError(error: unknown): string {
  try {
    if (error instanceof Error) {
      const anyError = error as any;
      const parts = [anyError.name, anyError.code, error.message].filter(
        (p) => typeof p === 'string' && p.length > 0
      );
      return (parts.length > 0 ? parts.join(' | ') : 'UnknownError').slice(0, 400);
    }
    if (typeof error === 'string') return error.slice(0, 400);
    return JSON.stringify(error).slice(0, 400);
  } catch {
    return 'UnserializableError';
  }
}
