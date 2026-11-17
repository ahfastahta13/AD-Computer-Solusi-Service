/**
 * Pemeriksaan status Device Fonnte (read-only).
 *
 * Hanya membaca status device yang sudah ada melalui endpoint resmi
 * `POST https://api.fonnte.com/device`. Modul ini TIDAK membuat device baru
 * dan TIDAK mengirim pesan WhatsApp.
 */

export const FONNTE_TOKEN_ENV_VAR = 'WHATSAPP_API_TOKEN';
export const FONNTE_DEVICE_URL = 'https://api.fonnte.com/device';

export interface FonnteDeviceCheck {
  configured: boolean;
  connected: boolean;
  httpStatus: number | null;
  latencyMs: number;
  statusRaw?: string;
  deviceStatus?: string;
  deviceNumber?: string;
  deviceName?: string;
  quota?: string;
  packageName?: string;
  expired?: string;
  error?: string;
}

export async function checkFonnteDevice(timeoutMs = 8000): Promise<FonnteDeviceCheck> {
  const token = (process.env.WHATSAPP_API_TOKEN || '').trim();

  if (!token) {
    return {
      configured: false,
      connected: false,
      httpStatus: null,
      latencyMs: 0,
      error: 'WHATSAPP_API_TOKEN belum dikonfigurasi.',
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(FONNTE_DEVICE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: token },
    });

    const latencyMs = Date.now() - startedAt;
    const data: any = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        httpStatus: response.status,
        latencyMs,
        error: `Fonnte merespons HTTP ${response.status}.`,
      };
    }

    if (!data || data.status !== true) {
      return {
        configured: true,
        connected: false,
        httpStatus: response.status,
        latencyMs,
        statusRaw: data?.status === true ? 'true' : 'false',
        error: typeof data?.reason === 'string' && data.reason
          ? `Fonnte menolak permintaan: ${data.reason.slice(0, 120)}`
          : 'Token Fonnte tidak valid atau permintaan ditolak.',
      };
    }

    const deviceStatus = typeof data.device_status === 'string' ? data.device_status : undefined;
    const connected = (deviceStatus || '').toLowerCase() === 'connect';

    return {
      configured: true,
      connected,
      httpStatus: response.status,
      latencyMs,
      statusRaw: 'true',
      deviceStatus,
      deviceNumber: typeof data.device === 'string' ? data.device : undefined,
      deviceName: typeof data.name === 'string' ? data.name : undefined,
      quota: data.quota !== undefined && data.quota !== null ? String(data.quota) : undefined,
      packageName: typeof data.package === 'string' ? data.package : undefined,
      expired: typeof data.expired === 'string' ? data.expired : undefined,
      error: connected
        ? undefined
        : `Device WhatsApp sedang ${deviceStatus || 'tidak terhubung'}.`,
    };
  } catch (error) {
    const err = error as Error;
    const isTimeout = err?.name === 'AbortError' || err?.name === 'TimeoutError';
    return {
      configured: true,
      connected: false,
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
      error: isTimeout ? 'Koneksi ke Fonnte timeout.' : 'Gagal menghubungi Fonnte.',
    };
  } finally {
    clearTimeout(timer);
  }
}
