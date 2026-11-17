'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import NotificationRecipientModal, {
  type RecipientRecord,
} from '@/components/admin/NotificationRecipientModal';
import {
  NOTIFICATION_EVENT_LABELS,
  RECIPIENT_TYPE_LABELS,
  type NotificationRecipientType,
} from '@/lib/notification-recipient-constants';

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ProviderConfig {
  provider: string;
  configured: boolean;
  notifyAdminEnabled: boolean;
  notifyCustomerEnabled: boolean;
}

interface Feedback {
  type: 'success' | 'error';
  text: string;
}

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  ADMIN: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
  CUSTOMER: { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' },
  TECHNICIAN: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' },
  OTHER: { bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: 'rgba(148, 163, 184, 0.35)' },
};

export default function NotificationSettingsPage() {
  const [recipients, setRecipients] = useState<RecipientRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<RecipientRecord | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RecipientRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notification-recipients');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setRecipients(data.recipients || []);
        setCustomers(data.customers || []);
        setConfig(data.config || null);
      } else {
        setFeedback({ type: 'error', text: data.message || 'Gagal memuat konfigurasi notifikasi.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Terjadi kesalahan jaringan saat memuat data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingRecipient(null);
    setIsModalOpen(true);
  };

  const openEditModal = (recipient: RecipientRecord) => {
    setEditingRecipient(recipient);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (recipient: RecipientRecord) => {
    setTogglingId(recipient.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/notification-recipients/${recipient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !recipient.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setRecipients((prev) =>
          prev.map((item) => (item.id === recipient.id ? { ...item, isActive: !recipient.isActive } : item))
        );
        setFeedback({
          type: 'success',
          text: `Penerima ${recipient.name} ${!recipient.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
        });
      } else {
        setFeedback({ type: 'error', text: data.message || 'Gagal mengubah status penerima.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestSend = async (recipient: RecipientRecord) => {
    setTestingId(recipient.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/notification-recipients/${recipient.id}/test`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setFeedback({
          type: 'success',
          text: `${data.message}${data.messageId ? ` (ID: ${data.messageId})` : ''}`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: `${data.message || 'Pesan uji gagal dikirim.'}${data.error ? ` Penyebab: ${data.error}` : ''}`,
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Terjadi kesalahan jaringan saat mengirim pesan uji.' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/notification-recipients/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setRecipients((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        setFeedback({ type: 'success', text: data.message || 'Penerima berhasil dihapus.' });
        setDeleteTarget(null);
      } else {
        setFeedback({ type: 'error', text: data.message || 'Gagal menghapus penerima.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = recipients.filter((item) => item.isActive).length;

  const renderEventChips = (recipient: RecipientRecord) => {
    const chips: string[] = [];
    if (recipient.notifyNewOrder) chips.push(NOTIFICATION_EVENT_LABELS.NEW_ORDER);
    if (recipient.notifyStatusChange) chips.push(NOTIFICATION_EVENT_LABELS.STATUS_CHANGE);
    if (recipient.notifyServiceCompleted) chips.push(NOTIFICATION_EVENT_LABELS.SERVICE_COMPLETED);
    return chips.length > 0 ? chips : ['—'];
  };

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
            <BellRing size={22} style={{ color: '#ef4444' }} />
            Konfigurasi Notifikasi
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Kelola nomor WhatsApp penerima notifikasi otomatis pesanan servis AD Computer.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={fetchData} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Tambah Penerima</span>
          </button>
        </div>
      </div>

      {/* Provider Info */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '18px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Provider: {config?.provider ? config.provider.toUpperCase() : '-'}{' '}
              {config?.configured ? (
                <span style={{ color: '#10b981' }}>• Terkonfigurasi</span>
              ) : (
                <span style={{ color: '#f87171' }}>• Belum terkonfigurasi</span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
              Pengirim: Device Admin Fonnte (token hanya tersimpan di environment server).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <span className="badge badge-completed">
            <span className="badge-dot" />
            {recipients.length} Penerima
          </span>
          <span className="badge badge-diagnosing">
            <span className="badge-dot" />
            {activeCount} Aktif
          </span>
        </div>
      </div>

      {config && !config.configured && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'rgba(245, 158, 11, 0.08)',
            color: '#fbbf24',
            fontSize: '0.85rem',
          }}
        >
          <Info size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            Kredensial provider WhatsApp belum terdeteksi di server. Notifikasi tidak akan terkirim
            sampai konfigurasi environment dilengkapi oleh Admin sistem.
          </span>
        </div>
      )}

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

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#ef4444' }} />
          <span>Memuat konfigurasi notifikasi...</span>
        </div>
      ) : recipients.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BellRing size={40} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Belum ada nomor penerima notifikasi.</p>
          <p style={{ margin: '8px 0 16px 0', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
            Tambahkan nomor WhatsApp Admin, Customer, Teknisi, atau lainnya untuk menerima notifikasi otomatis.
          </p>
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Tambah Penerima Pertama</span>
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Penerima</th>
                  <th>Jenis</th>
                  <th>Jenis Notifikasi</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((recipient) => {
                  const typeStyle = TYPE_STYLES[recipient.recipientType] || TYPE_STYLES.OTHER;
                  const typeLabel =
                    RECIPIENT_TYPE_LABELS[recipient.recipientType as NotificationRecipientType] ||
                    recipient.recipientType;

                  return (
                    <tr key={recipient.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{recipient.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {recipient.phone}
                        </div>
                        {recipient.notes && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                            {recipient.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            background: typeStyle.bg,
                            color: typeStyle.color,
                            border: `1px solid ${typeStyle.border}`,
                          }}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {renderEventChips(recipient).map((chip) => (
                            <span
                              key={chip}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-glass)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(recipient)}
                          disabled={togglingId === recipient.id}
                          className={`badge ${recipient.isActive ? 'badge-completed' : 'badge-danger'}`}
                          style={{
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          title={recipient.isActive ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                        >
                          {togglingId === recipient.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <span className="badge-dot" />
                          )}
                          {recipient.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleTestSend(recipient)}
                            disabled={testingId === recipient.id}
                            className="btn btn-outline btn-sm"
                            title="Kirim pesan percobaan"
                          >
                            {testingId === recipient.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                            <span>Test</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(recipient)}
                            className="btn btn-secondary btn-sm"
                            title="Edit penerima"
                          >
                            <Pencil size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(recipient)}
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                            title="Hapus penerima"
                          >
                            <Trash2 size={14} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NotificationRecipientModal
        isOpen={isModalOpen}
        initial={editingRecipient}
        customers={customers}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setFeedback({ type: 'success', text: 'Konfigurasi penerima berhasil disimpan.' });
          fetchData();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Penerima Notifikasi?"
        message={`Nomor ${deleteTarget?.name || ''} (${deleteTarget?.phone || ''}) tidak akan menerima notifikasi otomatis lagi. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
        type="danger"
      />
    </div>
  );
}
