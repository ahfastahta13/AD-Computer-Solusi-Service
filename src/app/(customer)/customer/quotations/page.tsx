'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Search, Loader2, CheckCircle2, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import { Quotation } from '@/types';
import QuotationDocument from '@/components/ui/QuotationDocument';

export default function CustomerQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/quotations');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuotations(data.quotations || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch quotations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'APPROVED', className: 'badge-completed' };
      case 'REJECTED':
        return { label: 'REJECTED', className: 'badge-pending' };
      case 'SENT':
        return { label: 'SENT (WAITING APPROVAL)', className: 'badge-quoted' };
      default:
        return { label: status, className: 'badge-pending' };
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const query = searchQuery.toLowerCase();
    return (
      q.quotationNumber.toLowerCase().includes(query) ||
      (q.serviceOrder?.ticketNumber && q.serviceOrder.ticketNumber.toLowerCase().includes(query)) ||
      (q.serviceOrder?.deviceBrand && q.serviceOrder.deviceBrand.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        className="card-glass"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} style={{ color: 'var(--warning)' }} />
            Surat Penawaran Biaya (Quotation Manager)
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Tinjau rincian biaya suku cadang dan perbaikan resmi untuk menyetujui (approve) atau menolak penawaran.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '420px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari no. quotation / no. tiket..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '38px', background: 'var(--bg-card)' }}
        />
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-subtle)',
          }}
        />
      </div>

      {/* Quotations List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-light)' }} />
          <span>Memuat data quotation...</span>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Belum ada surat penawaran biaya yang diterbitkan saat ini.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredQuotations.map((quo) => {
            const badge = getStatusBadge(quo.status);
            return (
              <div
                key={quo.id}
                className="card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: quo.status === 'SENT' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-glass)',
                  background: quo.status === 'SENT' ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg-card)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary-light)' }}>
                      #{quo.quotationNumber}
                    </strong>
                    <span className={`badge ${badge.className}`}>
                      <span className="badge-dot" />
                      {badge.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                    <div><strong>Referensi Tiket:</strong> #{quo.serviceOrder?.ticketNumber}</div>
                    <div><strong>Perangkat:</strong> {quo.serviceOrder?.deviceBrand} {quo.serviceOrder?.deviceModel}</div>
                    <div><strong>Jumlah Item:</strong> {quo.items?.length || 0} Item Part & Jasa</div>
                  </div>
                </div>

                <div>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Total Penawaran Biaya</span>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                      {formatPrice(quo.total)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedQuotation(quo)}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Eye size={14} />
                    <span>Buka Dokumen Official Quotation</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Official Business Document Quotation Viewer Modal */}
      <QuotationDocument
        quotation={selectedQuotation}
        isOpen={!!selectedQuotation}
        onClose={() => setSelectedQuotation(null)}
        onRefresh={fetchQuotations}
      />
    </div>
  );
}
