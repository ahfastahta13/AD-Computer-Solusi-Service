import { cookies } from 'next/headers';
import { COOKIE_NAME, verifyJWT } from '@/lib/jwt';

export type AdminAuthResult =
  | { ok: true; userId: string; name: string; email: string }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Validasi sesi Admin di sisi server untuk endpoint konfigurasi.
 * Customer/guest tidak diizinkan meskipun memanggil API secara langsung.
 */
export async function requireAdminSession(): Promise<AdminAuthResult> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false, status: 401, message: 'Tidak terotorisasi.' };
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return { ok: false, status: 401, message: 'Sesi tidak valid atau kedaluwarsa.' };
  }

  if (payload.role !== 'ADMIN') {
    return { ok: false, status: 403, message: 'Akses khusus Administrator.' };
  }

  return {
    ok: true,
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
  };
}
