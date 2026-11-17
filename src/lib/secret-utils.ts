/**
 * Utilitas penyamaran nilai sensitif.
 * Hanya dipakai di server. Jangan pernah mengirim nilai asli ke frontend.
 */

/** Samarkan secret: tampilkan 4 karakter awal & 4 akhir untuk nilai panjang. */
export function maskSecret(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (raw.length <= 12) return '••••••••';
  return `${raw.slice(0, 4)}••••••••${raw.slice(-4)}`;
}

/** Samarkan identifier (chat ID, nomor internal): hanya 4 karakter terakhir. */
export function maskIdentifier(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (raw.length <= 4) return '••••';
  return `••••${raw.slice(-4)}`;
}
