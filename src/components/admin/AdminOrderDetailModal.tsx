'use client';

import React, { useState } from 'react';
import {
  X,
  Laptop,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wrench,
  FileText,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Clock,
  Building2,
} from 'lucide-react';
import { ServiceOrder } from '@/types';

interface AdminOrderDetailModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDiagnosis?: (order: ServiceOrder) => void;
  onOpenQuotation?: (order: ServiceOrder) => void;
  onRefresh?: () => void;
}

export default function AdminOrderDetailModal({
  order,
  isOpen,
  onClose,
  onOpenDiagnosis,
  onOpenQuotation,
  onRefresh,
}: AdminOrderDetailModalProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  if (!isOpen || !order) return null;

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, status: newStatus, notes: adminNotes }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg(`Status berhasil diperbarui menjadi ${newStatus}`);
        setAdminNotes('');
        if (onRefresh) onRefresh();
      } else {
        setStatusMsg(data.message || 'Gagal mengubah status.');
      }
    } catch {
      setStatusMsg('Terjadi kesalahan jaringan.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const statusOptions = [
    { value: 'SUBMITTED', label: '1. SUBMITTED (Permohonan Masuk)' },
    { value: 'DIAGNOSING', label: '2. DIAGNOSING (Proses Diagnosa Lab)' },
    { value: 'WAITING_APPROVAL', label: '3. WAITING_APPROVAL (Menunggu Customer)' },
    { value: 'IN_PROGRESS', label: '4. IN_PROGRESS (Pengerjaan Servis)' },
    { value: 'COMPLETED', label: '5. COMPLETED (Selesai Pengerjaan)' },
    { value: 'DELIVERED', label: '6. DELIVERED (Unit Diambil/Diserahkan)' },
    { value: 'CANCELLED', label: 'CANCELLED (Dibatalkan)' },
  ];

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
          maxWidth: '780px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '32px',
          background: '#0d1222',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          animation: 'fadeIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
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

        {/* Modal Header */}
        <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={24} style={{ color: '#ef4444' }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Detail Tiket Servis #{order.ticketNumber}
              </h2>
            </div>
            <span className="badge badge-pending" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
              Status: {order.status}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Didaftarkan: {new Date(order.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Interactive Status Switcher Controls */}
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#f87171' }}>
              ⚡ Ubah Status Workflow Servis (Admin Controller):
            </label>
            {isUpdatingStatus && (
              <span style={{ fontSize: '0.8rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Loader2 size={14} className="animate-spin" /> Memperbarui...
              </span>
            )}
          </div>

          <select
            className="form-control"
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdatingStatus}
            style={{ background: '#0a0d17', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: 600, color: '#fff' }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Catatan update status untuk WhatsApp customer (opsional)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={isUpdatingStatus}
              style={{ fontSize: '0.82rem', background: '#0a0d17', borderColor: 'var(--border-glass)' }}
            />
          </div>

          {statusMsg && (
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Grid Section 1: Customer & Contact & Device */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Customer & Contact Box */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#f87171' }}>
              <User size={18} />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Customer & Kontak</strong>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
              <div><strong>Nama:</strong> {order.customer?.name || 'Customer'}</div>
              <div><strong>Email:</strong> {order.customer?.email}</div>
              <div><strong>Telepon/WA:</strong> {order.customer?.phone || '-'}</div>
              <div><strong>Alamat:</strong> {order.customer?.address || '-'}</div>
            </div>
          </div>

          {/* Device Box */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--primary-light)' }}>
              <Laptop size={18} />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Informasi Perangkat</strong>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
              <div><strong>Tipe Perangkat:</strong> {order.deviceType}</div>
              <div><strong>Merk / Brand:</strong> {order.deviceBrand}</div>
              <div><strong>Seri / Model:</strong> {order.deviceModel}</div>
              <div><strong>Kategori Service:</strong> {order.service?.name || 'General Diagnostic'}</div>
            </div>
          </div>
        </div>

        {/* Grid Section 2: Problem Symptoms & Schedule & Service Type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Symptoms & Photos Box */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Deskripsi Keluhan / Problem:
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              {order.problemDescription}
            </p>

            {order.attachment && (
              <a
                href={order.attachment}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                <ExternalLink size={14} />
                <span>Lihat Foto / Lampiran Fisik Perangkat</span>
              </a>
            )}
          </div>

          {/* Service Type & Schedule */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
              <div>
                <strong>Metode Servis:</strong>{' '}
                <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-main)' }}>
                  {order.serviceType} Service
                </span>
              </div>

              {order.serviceType === 'onsite' && (
                <div>
                  <strong>Alamat Kunjungan Onsite:</strong><br />
                  {order.address || '-'}
                </div>
              )}

              <div>
                <strong>Preferred Schedule:</strong><br />
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                  {order.preferredSchedule
                    ? new Date(order.preferredSchedule).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Diagnosis Details */}
        <div style={{ marginBottom: '20px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} color="var(--primary-light)" />
              Hasil Diagnosa Lab:
            </strong>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenDiagnosis) onOpenDiagnosis(order);
              }}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--primary-light)' }}
            >
              Edit Diagnosa
            </button>
          </div>

          {order.diagnosis ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <div><strong>Akar Permasalahan:</strong> {order.diagnosis.diagnosis}</div>
              <div><strong>Rekomendasi:</strong> {order.diagnosis.recommendation}</div>
              <div><strong>Estimasi Biaya:</strong> {formatPrice(order.diagnosis.estimatedCost)}</div>
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-subtle)' }}>Belum ada hasil diagnosa yang dimasukkan.</span>
          )}
        </div>

        {/* Section 4: Quotation Breakdown */}
        <div style={{ marginBottom: '20px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={16} color="var(--warning)" />
              Official Quotation Penawaran:
            </strong>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenQuotation) onOpenQuotation(order);
              }}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: 'rgba(245, 158, 11, 0.4)', color: 'var(--warning)' }}
            >
              Edit / Build Quotation
            </button>
          </div>

          {order.quotation ? (
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', marginBottom: '8px' }}>
                No. Quotation: <strong>#{order.quotation.quotationNumber}</strong> • Status: <strong style={{ color: 'var(--warning)' }}>{order.quotation.status}</strong>
              </div>

              {order.quotation.items && order.quotation.items.length > 0 && (
                <div className="table-responsive" style={{ marginBottom: '10px' }}>
                  <table className="custom-table" style={{ fontSize: '0.8rem', margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Deskripsi</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Harga</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.quotation.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.description}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{formatPrice(item.unitPrice)}</td>
                          <td style={{ textAlign: 'right' }}>{formatPrice(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                GRAND TOTAL: {formatPrice(order.quotation.total)}
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-subtle)' }}>Belum ada surat penawaran biaya yang diterbitkan.</span>
          )}
        </div>

        {/* Close Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: 'none', padding: '8px 24px' }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
