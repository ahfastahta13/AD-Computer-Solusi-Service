'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

type ServiceStatus = 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
type ConfigService = 'ai' | 'fonnte' | 'telegram' | 'database';

interface ServiceCheck {
  service: ConfigService;
  status: ServiceStatus;
  ok: boolean;
  latencyMs: number;
  checkedAt: string;
  message: string;
  details: Record<string, string | number | boolean | null>;
}

interface Snapshot {
  success: boolean;
  checkedAt: string;
  ai: {
    provider: string;
    primaryModel: string;
    models: string[];
    keyConfigured: boolean;
    keySource: 'environment' | 'project-fallback' | 'none';
    maskedKey: string;
    envKey: string;
    envModel: string;
    check: ServiceCheck;
  };
  whatsapp: {
    provider: string;
    configured: boolean;
    maskedToken: string;
    envToken: string;
    adminRecipient: string | null;
    notifyAdmin: boolean;
    notifyCustomer: boolean;
    check: ServiceCheck;
  };
  telegram: {
    configured: boolean;
    maskedToken: string;
    maskedChatId: string;
    envToken: string;
    envChatId: string;
    check: ServiceCheck;
  };
  database: {
    type: string;
    name: string | null;
    envVar: string;
    check: ServiceCheck;
  };
  auth: {
    status: ServiceStatus;
    functional: boolean;
    jwtEnvVar: string;
    jwtEnvConfigured: boolean;
    secretSource: 'environment' | 'project-fallback';
    cookieName: string;
    adminCount: number;
    customerCount: number;
    totalUsers: number;
    checkedAt: string;
  };
}

interface Feedback {
  type: 'success' | 'error';
  text: string;
}

const STATUS_META: Record<
  ServiceStatus,
  { label: string; badge: string; color: string }
> = {
  CONNECTED: { label: 'Connected', badge: 'badge-completed', color: '#34d399' },
  DISCONNECTED: { label: 'Disconnected', badge: 'badge-danger', color: '#f87171' },
  NOT_CONFIGURED: { label: 'Not Configured', badge: 'badge-pending', color: '#fbbf24' },
  ERROR: { label: 'Error', badge: 'badge-danger', color: '#f87171' },
};

const SERVICE_LABELS: Record<ConfigService, string> = {
  ai: 'AI Provider',
  fonnte: 'WhatsApp Fonnte',
  telegram: 'Telegram',
  database: 'Database',
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const meta = STATUS_META[status] || STATUS_META.ERROR;
  return (
    <span className={`badge ${meta.badge}`} style={{ whiteSpace: 'nowrap' }}>
      <span className="badge-dot" />
      {meta.label}
    </span>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '8px 0',
        borderBottom: '1px solid var(--border-glass)',
      }}
    >
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '0.83rem',
          fontWeight: 500,
          textAlign: 'right',
          wordBreak: 'break-word',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function IconBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '11px',
        background: `${color}1f`,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export default function SystemConfigPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checking, setChecking] = useState<Record<string, boolean>>({});

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/system-config', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.success) {
        setData(json as Snapshot);
      } else {
        setError(json.message || 'Gagal memuat konfigurasi sistem.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan saat memuat konfigurasi sistem.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const runTest = async (service: ConfigService) => {
    setChecking((prev) => ({ ...prev, [service]: true }));
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/system-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const json = await response.json().catch(() => ({}));

      if (response.ok && json.success && json.check) {
        const check = json.check as ServiceCheck;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [service]: { ...(prev as any)[service], check },
          } as Snapshot;
        });
        setFeedback({
          type: check.status === 'CONNECTED' ? 'success' : 'error',
          text: `${SERVICE_LABELS[service]}: ${check.message}`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: json.message || 'Gagal menjalankan pemeriksaan koneksi.',
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Terjadi kesalahan jaringan saat menguji koneksi.' });
    } finally {
      setChecking((prev) => ({ ...prev, [service]: false }));
    }
  };

  const renderTestButton = (service: ConfigService) => {
    const isTesting = Boolean(checking[service]);
    return (
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => runTest(service)}
        disabled={isTesting || loading}
      >
        {isTesting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        <span>{isTesting ? 'Menguji...' : 'Test Connection'}</span>
      </button>
    );
  };

  const renderFooter = (check: ServiceCheck, service: ConfigService) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: 'auto',
        paddingTop: '10px',
      }}
    >
      <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
        Terakhir diperiksa: {formatDateTime(check.checkedAt)}
        {check.latencyMs > 0 ? ` • ${check.latencyMs} ms` : ''}
      </span>
      {renderTestButton(service)}
    </div>
  );

  const renderCheckMessage = (check: ServiceCheck) => (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
        padding: '9px 12px',
        borderRadius: 'var(--radius-md)',
        background: `${STATUS_META[check.status].color}12`,
        border: `1px solid ${STATUS_META[check.status].color}35`,
        color: STATUS_META[check.status].color,
        fontSize: '0.8rem',
        lineHeight: 1.5,
      }}
    >
      {check.status === 'CONNECTED' ? (
        <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
      ) : (
        <XCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
      )}
      <span>{check.message}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div
        className="card-glass"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid #ef4444',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Settings size={22} style={{ color: '#ef4444' }} />
            Konfigurasi Sistem
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Informasi konfigurasi aktual dan status koneksi layanan AD Computer.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchConfig}
          className="btn btn-secondary btn-sm"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Semua</span>
        </button>
      </div>

      {feedback && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            border:
              feedback.type === 'success'
                ? '1px solid rgba(16, 185, 129, 0.35)'
                : '1px solid rgba(239, 68, 68, 0.35)',
            background:
              feedback.type === 'success'
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.85rem',
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          ) : (
            <XCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading && !data ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '35vh',
            gap: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <Loader2 className="animate-spin" size={24} style={{ color: '#ef4444' }} />
          <span>Memeriksa konfigurasi dan koneksi layanan...</span>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertTriangle size={36} style={{ color: '#fbbf24', margin: '0 auto 12px auto' }} />
          <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)' }}>{error}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={fetchConfig}>
            <RefreshCw size={14} />
            <span>Coba Lagi</span>
          </button>
        </div>
      ) : data ? (
        <>
          {/* Ringkasan Status Sistem */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '14px',
            }}
          >
            {[
              {
                key: 'ai',
                label: 'AI Provider',
                icon: <Bot size={18} />,
                color: '#8b5cf6',
                status: data.ai.check.status,
                detail: data.ai.provider,
              },
              {
                key: 'whatsapp',
                label: 'WhatsApp Fonnte',
                icon: <MessageCircle size={18} />,
                color: '#10b981',
                status: data.whatsapp.check.status,
                detail: data.whatsapp.provider.toUpperCase(),
              },
              {
                key: 'telegram',
                label: 'Telegram',
                icon: <Send size={18} />,
                color: '#0ea5e9',
                status: data.telegram.check.status,
                detail: 'Bot API',
              },
              {
                key: 'database',
                label: 'Database',
                icon: <Database size={18} />,
                color: '#f59e0b',
                status: data.database.check.status,
                detail: data.database.type,
              },
              {
                key: 'auth',
                label: 'Autentikasi',
                icon: <ShieldCheck size={18} />,
                color: '#ef4444',
                status: data.auth.status,
                detail: 'JWT Session',
              },
            ].map((item) => (
              <div key={item.key} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <IconBox color={item.color}>{item.icon}</IconBox>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>{item.detail}</div>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>

          {/* Kartu konfigurasi layanan */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '18px',
            }}
          >
            {/* AI Provider */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <IconBox color="#8b5cf6"><Bot size={20} /></IconBox>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>AI Provider</h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
                      Provider yang dipakai chatbot aktif
                    </p>
                  </div>
                </div>
                <StatusBadge status={data.ai.check.status} />
              </div>

              {renderCheckMessage(data.ai.check)}

              <div>
                <InfoRow label="Provider" value={data.ai.provider} />
                <InfoRow label="Model Utama" value={data.ai.primaryModel} mono />
                <InfoRow
                  label="Model Fallback"
                  value={data.ai.models.slice(1).join(', ') || '—'}
                  mono
                />
                <InfoRow
                  label="API Key"
                  value={data.ai.maskedKey || 'Belum dikonfigurasi'}
                  mono
                />
                <InfoRow label="Env API Key" value={data.ai.envKey} mono />
                <InfoRow
                  label="Sumber Key"
                  value={
                    data.ai.keySource === 'environment'
                      ? 'Environment server'
                      : data.ai.keySource === 'project-fallback'
                        ? 'Fallback internal proyek'
                        : 'Tidak tersedia'
                  }
                />
                <InfoRow label="Env Model Chain" value={data.ai.envModel} mono />
              </div>

              {data.ai.keySource === 'project-fallback' && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    API key AI saat ini berasal dari fallback di source code. Untuk produksi,
                    set <code>{data.ai.envKey}</code> pada environment server.
                  </span>
                </div>
              )}

              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                Dashboard tidak menulis file <code>.env</code>. Perubahan API key dilakukan di
                environment server, lalu restart aplikasi.
              </p>

              {renderFooter(data.ai.check, 'ai')}
            </div>

            {/* WhatsApp Fonnte */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <IconBox color="#10b981"><MessageCircle size={20} /></IconBox>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>WhatsApp Fonnte</h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
                      Gateway notifikasi WhatsApp
                    </p>
                  </div>
                </div>
                <StatusBadge status={data.whatsapp.check.status} />
              </div>

              {renderCheckMessage(data.whatsapp.check)}

              <div>
                <InfoRow label="Provider" value={data.whatsapp.provider.toUpperCase()} />
                <InfoRow
                  label="Token"
                  value={data.whatsapp.maskedToken || 'Belum dikonfigurasi'}
                  mono
                />
                <InfoRow label="Env Token" value={data.whatsapp.envToken} mono />
                <InfoRow
                  label="Device Status"
                  value={String(data.whatsapp.check.details.deviceStatus || '—')}
                />
                <InfoRow
                  label="Nomor Pengirim"
                  value={String(
                    data.whatsapp.check.details.deviceNumber ||
                      data.whatsapp.adminRecipient ||
                      '—'
                  )}
                  mono
                />
                <InfoRow
                  label="Nama Device"
                  value={String(data.whatsapp.check.details.deviceName || '—')}
                />
                <InfoRow
                  label="Kuota"
                  value={String(data.whatsapp.check.details.quota || '—')}
                />
                <InfoRow
                  label="Aktif Sampai"
                  value={String(data.whatsapp.check.details.expired || '—')}
                />
                <InfoRow
                  label="Notifikasi Admin"
                  value={data.whatsapp.notifyAdmin ? 'Aktif' : 'Nonaktif'}
                />
                <InfoRow
                  label="Notifikasi Customer"
                  value={data.whatsapp.notifyCustomer ? 'Aktif' : 'Nonaktif'}
                />
              </div>

              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                Pemeriksaan memakai endpoint status device Fonnte. Tidak membuat device baru dan
                tidak mengirim pesan WhatsApp.
              </p>

              {renderFooter(data.whatsapp.check, 'fonnte')}
            </div>

            {/* Telegram */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <IconBox color="#0ea5e9"><Send size={20} /></IconBox>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Telegram</h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
                      Notifikasi real-time ke Admin
                    </p>
                  </div>
                </div>
                <StatusBadge status={data.telegram.check.status} />
              </div>

              {renderCheckMessage(data.telegram.check)}

              <div>
                <InfoRow
                  label="Bot Token"
                  value={data.telegram.maskedToken || 'Belum dikonfigurasi'}
                  mono
                />
                <InfoRow label="Env Bot Token" value={data.telegram.envToken} mono />
                <InfoRow
                  label="Chat ID"
                  value={data.telegram.maskedChatId || 'Belum dikonfigurasi'}
                  mono
                />
                <InfoRow label="Env Chat ID" value={data.telegram.envChatId} mono />
                <InfoRow
                  label="Bot Username"
                  value={
                    data.telegram.check.details.botUsername
                      ? `@${data.telegram.check.details.botUsername}`
                      : '—'
                  }
                />
                <InfoRow
                  label="Target Chat"
                  value={String(
                    data.telegram.check.details.chatName ||
                      data.telegram.check.details.chatType ||
                      '—'
                  )}
                />
              </div>

              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                Pemeriksaan memakai <code>getMe</code> dan <code>getChat</code> Telegram, sehingga
                tidak mengirim pesan ke chat Admin.
              </p>

              {renderFooter(data.telegram.check, 'telegram')}
            </div>

            {/* Database */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <IconBox color="#f59e0b"><Database size={20} /></IconBox>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Database</h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
                      Penyimpanan data utama sistem
                    </p>
                  </div>
                </div>
                <StatusBadge status={data.database.check.status} />
              </div>

              {renderCheckMessage(data.database.check)}

              <div>
                <InfoRow label="Jenis Database" value={data.database.type} />
                <InfoRow label="Nama Database" value={data.database.name || '—'} mono />
                <InfoRow label="Env Konfigurasi" value={data.database.envVar} mono />
                <InfoRow
                  label="Total User"
                  value={`${data.auth.totalUsers} (${data.auth.adminCount} Admin, ${data.auth.customerCount} Customer)`}
                />
                <InfoRow
                  label="Tabel Notifikasi"
                  value="notification_recipients aktif"
                />
              </div>

              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                Connection string dan password database tidak pernah ditampilkan ke browser.
              </p>

              {renderFooter(data.database.check, 'database')}
            </div>
          </div>

          {/* Autentikasi */}
          <div className="card" style={{ padding: '22px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <IconBox color="#ef4444"><ShieldCheck size={20} /></IconBox>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Autentikasi</h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
                    Sesi JWT Admin & Customer
                  </p>
                </div>
              </div>
              <StatusBadge status={data.auth.status} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0 24px',
              }}
            >
              <div>
                <InfoRow label="Mekanisme" value={`JWT Cookie (${data.auth.cookieName})`} mono />
                <InfoRow label="Env Secret" value={data.auth.jwtEnvVar} mono />
                <InfoRow
                  label="Sumber Secret"
                  value={
                    data.auth.secretSource === 'environment'
                      ? 'Environment server'
                      : 'Fallback internal proyek'
                  }
                />
              </div>
              <div>
                <InfoRow label="Uji Sign & Verify" value={data.auth.functional ? 'Berhasil' : 'Gagal'} />
                <InfoRow label="Akun Admin" value={String(data.auth.adminCount)} />
                <InfoRow label="Akun Customer" value={String(data.auth.customerCount)} />
                <InfoRow label="Terakhir diperiksa" value={formatDateTime(data.auth.checkedAt)} />
              </div>
            </div>

            {data.auth.secretSource === 'project-fallback' && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  marginTop: '12px',
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <code>{data.auth.jwtEnvVar}</code> belum diset; aplikasi memakai secret fallback
                  internal. Disarankan mengatur secret produksi di environment server.
                </span>
              </div>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-subtle)', textAlign: 'center' }}>
            Snapshot konfigurasi dibuat: {formatDateTime(data.checkedAt)} • Tidak ada secret lengkap
            yang dikirim ke browser.
          </p>
        </>
      ) : null}
    </div>
  );
}
