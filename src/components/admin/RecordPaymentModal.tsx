'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Loader2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ServiceOrder } from '@/types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedOrder?: ServiceOrder | null;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tunai (Cash)' },
  { value: 'TRANSFER_BCA', label: 'Transfer Bank BCA' },
  { value: 'TRANSFER_MANDIRI', label: 'Transfer Bank Mandiri' },
  { value: 'TRANSFER_BRI', label: 'Transfer Bank BRI' },
  { value: 'TRANSFER_BNI', label: 'Transfer Bank BNI' },
  { value: 'QRIS', label: 'QRIS (GoPay / OVO / Dana / ShopeePay)' },
  { value: 'DEBIT', label: 'Kartu Debit' },
  { value: 'KREDIT', label: 'Kartu Kredit' },
];

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedOrder,
}: RecordPaymentModalProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    serviceOrderId: preselectedOrder?.id || '',
    amount: '',
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    paymentDate: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      setForm((prev) => ({
        ...prev,
        serviceOrderId: preselectedOrder?.id || '',
        amount: '',
        notes: '',
      }));
      setError('');
      setSuccess('');
    }
  }, [isOpen, preselectedOrder]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.success) {
        // Show orders that are not CANCELLED and have a quotation (so we know the amount)
        const relevant = (data.orders || []).filter(
          (o: any) => o.status !== 'CANCELLED' && o.quotation
        );
        setOrders(relevant);

        // Auto-fill amount from quotation if preselected
        if (preselectedOrder?.id) {
          const matched = relevant.find((o: any) => o.id === preselectedOrder.id);
          if (matched?.quotation?.total) {
            setForm((prev) => ({ ...prev, amount: String(matched.quotation.total) }));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOrderChange = (orderId: string) => {
    const selected = orders.find((o) => o.id === orderId);
    setForm((prev) => ({
      ...prev,
      serviceOrderId: orderId,
      amount: selected?.quotation?.total ? String(selected.quotation.total) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.serviceOrderId) {
      setError('Pilih service order terlebih dahulu.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Nominal pembayaran wajib diisi dan harus lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Pembayaran berhasil dicatat!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setError(data.message || 'Gagal mencatat pembayaran.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedOrder = orders.find((o) => o.id === form.serviceOrderId);

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
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderTop: '3px solid #ef4444',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={18} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Catat Pembayaran Manual</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Record pembayaran customer</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Service Order Selector */}
          <div className="form-group">
            <label className="form-label">
              <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Service Order *
            </label>
            {loadingOrders ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Loader2 size={14} className="spin" /> Memuat data order...
              </div>
            ) : (
              <select
                className="form-control"
                value={form.serviceOrderId}
                onChange={(e) => handleOrderChange(e.target.value)}
                required
              >
                <option value="">-- Pilih Service Order --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.ticketNumber} — {o.customer?.name || 'Customer'} ({o.deviceBrand} {o.deviceModel})
                  </option>
                ))}
              </select>
            )}
            {selectedOrder && (
              <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>Customer:</span>
                  <strong>{selectedOrder.customer?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>Total Quotation:</span>
                  <strong style={{ color: '#10b981' }}>
                    {selectedOrder.quotation?.total
                      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedOrder.quotation.total)
                      : 'Belum ada quotation'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>Status Order:</span>
                  <span style={{ fontWeight: 600 }}>{selectedOrder.status}</span>
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Nominal Pembayaran (IDR) *</label>
            <input
              type="number"
              className="form-control"
              placeholder="Contoh: 650000"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              min="1"
              step="500"
              required
            />
            {form.amount && (
              <div style={{ marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                = {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(form.amount) || 0)}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">
              <CreditCard size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Metode Pembayaran *
            </label>
            <select
              className="form-control"
              value={form.paymentMethod}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              required
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div className="form-group">
            <label className="form-label">Status Pembayaran *</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { value: 'PAID', label: 'LUNAS', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                { value: 'PARTIAL', label: 'SEBAGIAN', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                { value: 'UNPAID', label: 'BELUM LUNAS', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, paymentStatus: s.value }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `2px solid ${form.paymentStatus === s.value ? s.color : 'var(--border-glass)'}`,
                    background: form.paymentStatus === s.value ? s.bg : 'transparent',
                    color: form.paymentStatus === s.value ? s.color : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Date */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Tanggal & Waktu Pembayaran
            </label>
            <input
              type="datetime-local"
              className="form-control"
              value={form.paymentDate}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Catatan (Opsional)</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Contoh: Pembayaran via transfer BCA, bukti transfer diterima..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', minWidth: '140px' }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Receipt size={14} />
                  <span>Catat Pembayaran</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
