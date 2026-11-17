'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  AlertCircle,
  Loader2,
  Cpu,
  User,
  Laptop,
} from 'lucide-react';
import { Quotation } from '@/types';
import { APP_CONFIG } from '@/lib/config';

interface QuotationDocumentProps {
  quotation: Quotation | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function QuotationDocument({
  quotation,
  isOpen,
  onClose,
  onRefresh,
}: QuotationDocumentProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !quotation) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleRespondSubmit = async () => {
    if (!confirmAction) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsResponding(true);

    try {
      const res = await fetch(`/api/customer/quotations/${quotation.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmAction }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          setConfirmAction(null);
          if (onRefresh) onRefresh();
        }, 1200);
      } else {
        setErrorMsg(data.message || 'Gagal memproses persetujuan penawaran.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan sistem. Silakan coba lagi.');
    } finally {
      setIsResponding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'APPROVED (Disetujui)', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'REJECTED':
        return { label: 'REJECTED (Ditolak)', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 'SENT':
        return { label: 'SENT (Menunggu Persetujuan)', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'EXPIRED':
        return { label: 'EXPIRED (Kadaluarsa)', bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
      case 'DRAFT':
      default:
        return { label: 'DRAFT', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    }
  };

  const badge = getStatusBadge(quotation.status);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 22, 0.88)',
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
          padding: '36px',
          background: '#0d1222',
          border: '1px solid var(--border-glass)',
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

        {/* 1. Official Business Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-glass)', paddingBottom: '24px', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Cpu size={20} />
              </div>
              <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)', letterSpacing: '0.3px' }}>
                {APP_CONFIG.name}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
              {APP_CONFIG.company.address}<br />
              Telp: {APP_CONFIG.company.phone} • Email: {APP_CONFIG.company.email}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Official Service Quotation
            </h2>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              No: #{quotation.quotationNumber}
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {/* 2. Customer & Device Information Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Ditujukan Kepada (Customer):
            </span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
              {quotation.serviceOrder?.customer?.name || 'Customer'}
            </strong>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {quotation.serviceOrder?.customer?.email}<br />
              {quotation.serviceOrder?.customer?.phone || '-'}<br />
              {quotation.serviceOrder?.customer?.address || '-'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Referensi Tiket & Perangkat:
            </span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--primary-light)', display: 'block', marginBottom: '4px' }}>
              Tiket #{quotation.serviceOrder?.ticketNumber}
            </strong>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Perangkat:</strong> {quotation.serviceOrder?.deviceBrand} {quotation.serviceOrder?.deviceModel} ({quotation.serviceOrder?.deviceType})<br />
              <strong>Tanggal Diterbitkan:</strong> {new Date(quotation.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
              <strong>Metode Servis:</strong> <span style={{ textTransform: 'capitalize' }}>{quotation.serviceOrder?.serviceType} Service</span>
            </div>
          </div>
        </div>

        {/* 3. Diagnostic Findings Box */}
        {quotation.serviceOrder?.diagnosis && (
          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} />
              Hasil Diagnosa Lab & Akar Permasalahan:
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 6px 0', lineHeight: 1.5 }}>
              {quotation.serviceOrder.diagnosis.diagnosis}
            </p>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
              <strong>Rekomendasi Teknisi:</strong> {quotation.serviceOrder.diagnosis.recommendation}
            </div>
          </div>
        )}

        {/* 4. Professional Itemized Table */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-main)' }}>
            Rincian Suku Cadang & Biaya Penanganan Servis:
          </h4>

          <div className="table-responsive" style={{ border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
            <table className="custom-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No</th>
                  <th>Deskripsi Item / Suku Cadang / Jasa</th>
                  <th style={{ textAlign: 'center', width: '70px' }}>Qty</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Harga Satuan</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items && quotation.items.length > 0 ? (
                  quotation.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{item.description}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatPrice(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                        {formatPrice(item.subtotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada rincian item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Financial Calculation Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '100%', maxWidth: '320px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <span>Subtotal Items:</span>
              <strong>{formatPrice(quotation.subtotal)}</strong>
            </div>

            {quotation.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: '#f87171' }}>
                <span>Diskon / Potongan:</span>
                <strong>- {formatPrice(quotation.discount)}</strong>
              </div>
            )}

            <div style={{ borderTop: '2px solid var(--border-glass)', paddingTop: '10px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>GRAND TOTAL:</span>
              <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                {formatPrice(quotation.total)}
              </strong>
            </div>
          </div>
        </div>

        {/* 6. Terms & Warranty Notes */}
        <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed var(--border-glass)', fontSize: '0.8rem', color: 'var(--text-subtle)', marginBottom: '24px', lineHeight: 1.5 }}>
          <strong>Catatan & Syarat Ketentuan:</strong><br />
          • {quotation.notes || 'Penawaran ini berlaku selama 14 hari sejak diterbitkan. Semua suku cadang terpasang mendapatkan garansi 90 hari.'}
        </div>

        {/* Feedback Alert Banners */}
        {errorMsg && (
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 7. Action Controls for Customer Response */}
        {confirmAction ? (
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
              {confirmAction === 'APPROVE'
                ? 'Konfirmasi Persetujuan Quotation Penawaran Harga?'
                : 'Konfirmasi Penolakan Penawaran Harga?'}
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {confirmAction === 'APPROVE'
                ? `Dengan menyetujui, Anda menyetujui total biaya Rp ${quotation.total.toLocaleString('id-ID')} dan status servis akan diproses ke IN_PROGRESS.`
                : 'Penyetujuan yang ditolak akan menghentikan pengerjaan sementara.'}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="btn btn-outline btn-sm"
                disabled={isResponding}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleRespondSubmit}
                disabled={isResponding}
                className="btn btn-sm"
                style={{
                  background: confirmAction === 'APPROVE' ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                }}
              >
                {isResponding ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, Confirm {confirmAction === 'APPROVE' ? 'Setujui' : 'Tolak'}</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
              Tutup Dokumen
            </button>

            {/* Show Approve/Reject buttons if status is SENT or DRAFT */}
            {(quotation.status === 'SENT' || quotation.status === 'DRAFT') && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmAction('REJECT')}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                >
                  <XCircle size={15} />
                  <span>Tolak Penawaran</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmAction('APPROVE')}
                  className="btn btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Setujui Penawaran (Approve)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
