import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { runServiceCheck, type ConfigService } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

const ALLOWED_SERVICES: ConfigService[] = ['ai', 'fonnte', 'telegram', 'database'];

// POST: jalankan Test Connection untuk satu layanan (admin only)
export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Format data tidak valid.' },
      { status: 400 }
    );
  }

  const service = typeof body?.service === 'string' ? body.service.trim().toLowerCase() : '';
  if (!ALLOWED_SERVICES.includes(service as ConfigService)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Layanan tidak valid. Pilih: ai, fonnte, telegram, atau database.',
      },
      { status: 400 }
    );
  }

  try {
    const check = await runServiceCheck(service as ConfigService);
    return NextResponse.json({ success: true, check });
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    console.error('[SYSTEM_CONFIG_TEST_ERROR]', service, name);
    return NextResponse.json(
      { success: false, message: 'Gagal menjalankan pemeriksaan koneksi.' },
      { status: 500 }
    );
  }
}
