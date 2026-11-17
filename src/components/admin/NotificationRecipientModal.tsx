'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, Loader2, X } from 'lucide-react';
import {
  NOTIFICATION_EVENT_LABELS,
  RECIPIENT_TYPES,
  RECIPIENT_TYPE_LABELS,
  type NotificationRecipientType,
} from '@/lib/notification-recipient-constants';

export interface RecipientRecord {
  id: string;
  name: string;
  phone: string;
  recipientType: string;
  userId: string | null;
  notifyNewOrder: boolean;
  notifyStatusChange: boolean;
  notifyServiceCompleted: boolean;
  isActive: boolean;
  notes: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface NotificationRecipientModalProps {
  isOpen: boolean;
  initial?: RecipientRecord | null;
  customers: CustomerOption[];
  onClose: () => void;
  onSaved: () => void;
}

export default function NotificationRecipientModal({
  isOpen,
  initial,
  customers,
  onClose,
  onSaved,
}: NotificationRecipientModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [recipientType, setRecipientType] = useState<NotificationRecipientType>('ADMIN');
  const [userId, setUserId] = useState('');
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyStatusChange, setNotifyStatusChange] = useState(true);
  const [notifyServiceCompleted, setNotifyServiceCompleted] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name || '');
    setPhone(initial?.phone || '');
    setRecipientType(
      (initial?.recipientType as NotificationRecipientType) || 'ADMIN'
    );
    setUserId(initial?.userId || '');
    setNotifyNewOrder(initial?.notifyNewOrder ?? true);
    setNotifyStatusChange(initial?.notifyStatusChange ?? true);
    setNotifyServiceCompleted(initial?.notifyServiceCompleted ?? true);
    setIsActive(initial?.isActive ?? true);
    setNotes(initial?.notes || '');
    setErrorMsg('');
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');

    if (name.trim().length < 2) {
      setErrorMsg('Nama penerima wajib diisi (minimal 2 karakter).');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (recipientType === 'CUSTOMER' && !userId) {
      setErrorMsg('Pilih akun customer yang terkait dengan nomor ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = initial
        ? `/api/admin/notification-recipients/${initial.id}`
        : '/api/admin/notification-recipients';
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          recipientType,
          userId: recipientType === 'CUSTOMER' ? userId : null,
          notifyNewOrder,
          notifyStatusChange,
          notifyServiceCompleted,
          isActive,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        onSaved();
        onClose();
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan penerima notifikasi.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkboxRow = (
    label: string,
    checked: boolean,
    onChange: (value: boolean) => void,
    description?: string
  ) => (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-glass)',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#ef4444' }}
      />
      <span>
        <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600 }}>{label}</span>
        {description && (
          <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
            {description}
          </span>
        )}
      </span>
    </label>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '600px',
          padding: '28px',
          background: 'var(--bg-card)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-glass)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BellRing size={20} style={{ color: '#f87171' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              {initial ? 'Edit Penerima Notifikasi' : 'Tambah Penerima Notifikasi'}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Nomor WhatsApp yang akan menerima notifikasi otomatis dari sistem.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontSize: '0.85rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nama Penerima *</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Admin AD Computer"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nomor WhatsApp *</label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 085624299894"
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                Format 08xx atau 628xx. Akan dinormalisasi otomatis.
              </span>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Jenis Penerima *</label>
              <select
                className="form-control"
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as NotificationRecipientType)}
              >
                {RECIPIENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {RECIPIENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            {recipientType === 'CUSTOMER' && (
              <div className="form-group">
                <label className="form-label">Akun Customer Terkait *</label>
                <select
                  className="form-control"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="">— Pilih Customer —</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                  Customer hanya menerima notifikasi pesanan miliknya sendiri.
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Jenis Notifikasi yang Diterima</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {checkboxRow(
                NOTIFICATION_EVENT_LABELS.NEW_ORDER,
                notifyNewOrder,
                setNotifyNewOrder,
                'Saat customer membuat pesanan servis baru.'
              )}
              {checkboxRow(
                NOTIFICATION_EVENT_LABELS.STATUS_CHANGE,
                notifyStatusChange,
                setNotifyStatusChange,
                'Saat admin memperbarui status pengerjaan servis.'
              )}
              {checkboxRow(
                NOTIFICATION_EVENT_LABELS.SERVICE_COMPLETED,
                notifyServiceCompleted,
                setNotifyServiceCompleted,
                'Saat perangkat dinyatakan selesai diperbaiki.'
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <textarea
              className="form-control"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Nomor teknisi jaga shift malam"
              maxLength={300}
            />
          </div>

          {checkboxRow(
            'Penerima Aktif',
            isActive,
            setIsActive,
            'Nonaktifkan untuk menghentikan notifikasi tanpa menghapus data.'
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '22px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{initial ? 'Simpan Perubahan' : 'Tambah Penerima'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
