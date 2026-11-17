import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { buildAdminSystemPrompt } from '@/lib/ai-service';
import {
  generateChatCompletion,
  describeAiError,
  describeUnknownError,
} from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak terotorisasi.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Akses khusus Administrator.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { problemDescription, deviceInformation, symptoms, temperature } = body;

    if (!problemDescription || !deviceInformation) {
      return NextResponse.json(
        { success: false, message: 'Problem description dan device information wajib diisi.' },
        { status: 400 }
      );
    }

    // Prompt diagnosis admin dibangun dari data layanan + knowledge base aktual.
    let systemPrompt: string;
    try {
      systemPrompt = await buildAdminSystemPrompt();
    } catch (error) {
      console.error('[ADMIN_CHAT_PROMPT_DB_ERROR]', describeUnknownError(error));
      return NextResponse.json(
        {
          success: false,
          message:
            'Data layanan/knowledge base tidak dapat diakses (gangguan database). Silakan coba beberapa saat lagi.',
        },
        { status: 503 }
      );
    }

    const message = `Bantu saya menganalisa kasus berikut:
Device: ${deviceInformation}
Problem: ${problemDescription}
Symptoms: ${symptoms || 'Tidak disebutkan detail'}`;

    try {
      const completion = await generateChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        {
          temperature: typeof temperature === 'number' ? temperature : 0.6,
          maxTokens: 900,
          timeoutMs: 45_000,
          perModelTimeoutMs: 25_000,
        }
      );

      console.log(
        `[ADMIN_CHAT_OK] model=${completion.model} total=${Date.now() - startedAt}ms ai=${completion.latencyMs}ms attempts=${completion.attempts}`
      );

      return NextResponse.json({
        success: true,
        diagnosis: completion.content,
        provider: completion.model,
      });
    } catch (error) {
      const info = describeAiError(error);
      console.error(
        `[ADMIN_CHAT_AI_FAILED] kind=${info.kind} detail=${info.log} after=${Date.now() - startedAt}ms`
      );

      return NextResponse.json(
        {
          success: false,
          message:
            info.kind === 'timeout'
              ? 'AI Server terlalu lama merespons. Silakan coba lagi.'
              : 'AI Server sedang tidak dapat dihubungi. Silakan coba lagi beberapa saat lagi.',
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('[ADMIN_CHAT_ERROR]', describeUnknownError(error));
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat memproses permintaan AI admin.' },
      { status: 500 }
    );
  }
}
