'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Search,
  Loader2,
  Eye,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Quotation } from '@/types';
import QuotationDocument from '@/components/ui/QuotationDocument';

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/quotations');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuotations(data.quotations || []);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data quotation admin', err);
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
    }).format(price || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Disetujui', className: 'badge-completed', icon: CheckCircle };
      case 'REJECTED':
        return { label: 'Ditolak', className: 'badge-pending', icon: XCircle };
      case 'SENT':
        return { label: 'Menunggu Approval', className: 'badge-quoted', icon: Clock };
      case 'DRAFT':
        return { label: 'Draft', className: 'badge-pending', icon: FileText };
      default:
        return { label: status, className: 'badge-pending', icon: Clock };
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      q.quotationNumber.toLowerCase().includes(query) ||
      (q.serviceOrder?.ticketNumber && q.serviceOrder.ticketNumber.toLowerCase().includes(query)) ||
      (q.serviceOrder?.customer?.name && q.serviceOrder.customer.name.toLowerCase().includes(query)) ||
      (q.serviceOrder?.deviceBrand && q.serviceOrder.deviceBrand.toLowerCase().includes(query)) ||
      (q.serviceOrder?.deviceModel && q.serviceOrder.deviceModel.toLowerCase().includes(query));

    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={22} style={{ color: '#ef4444' }} />
            Quotation Management
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Daftar penawaran resmi suku cadang & estimasi biaya servis perangkat pelanggan
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchQuotations}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/orders"
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
          >
            <Plus size={14} />
            <span>Buat dari Service Order</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', flex: '1 1 300px', maxWidth: '450px' }}>
            <Search size={16} style={{ color: 'var(--text-subtle)' }} />
            <input
              type="text"
              placeholder="Cari no. quote, tiket, nama customer, atau unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', color: 'var(--text-main)', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['ALL', 'SENT', 'APPROVED', 'REJECTED', 'DRAFT'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  background: statusFilter === st ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : undefined,
                  border: statusFilter === st ? 'none' : undefined,
                }}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quotation Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#ef4444' }} />
          <span>Memuat data quotation...</span>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Receipt size={44} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Belum ada data surat penawaran biaya yang sesuai.</p>
        </div>
      ) : (
        <div className="card table-responsive" style={{ padding: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>No. Quotation</th>
                <th>Tiket Servis</th>
                <th>Nama Pelanggan</th>
                <th>Perangkat</th>
                <th>Item & Subtotal</th>
                <th>Diskon</th>
                <th>Total Biaya</th>
                <th>Status Approval</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((q) => {
                const badge = getStatusBadge(q.status);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={q.id}>
                    <td>
                      <strong style={{ color: 'var(--primary-light)', fontSize: '0.92rem' }}>
                        {q.quotationNumber}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        {new Date(q.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {q.serviceOrder?.ticketNumber || '-'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.serviceOrder?.customer?.name || 'Customer'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        {q.serviceOrder?.customer?.phone || q.serviceOrder?.customer?.email || '-'}
                      </div>
                    </td>
                    <td>
                      <div>
                        {q.serviceOrder?.deviceBrand} {q.serviceOrder?.deviceModel}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        {q.serviceOrder?.deviceType}
                      </div>
                    </td>
                    <td>
                      <div>{q.items?.length || 0} item</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        Subtotal: {formatPrice(q.subtotal)}
                      </div>
                    </td>
                    <td>
                      {q.discount > 0 ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                          -{formatPrice(q.discount)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>Rp 0</span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>
                        {formatPrice(q.total)}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${badge.className}`}>
                        <BadgeIcon size={12} style={{ marginRight: '4px' }} />
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedQuotation(q)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={13} />
                        <span>Lihat Dokumen</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quotation Preview Modal */}
      <QuotationDocument
        quotation={selectedQuotation}
        isOpen={!!selectedQuotation}
        onClose={() => setSelectedQuotation(null)}
        onRefresh={fetchQuotations}
      />
    </div>
  );
}
