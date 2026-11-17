import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getSystemConfigSnapshot } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

// GET: snapshot konfigurasi + status pemeriksaan aktual (admin only)
export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    const snapshot = await getSystemConfigSnapshot();
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    console.error('[SYSTEM_CONFIG_GET_ERROR]', name);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat konfigurasi sistem.' },
      { status: 500 }
    );
  }
}
