'use client';

import React, { useEffect, useState } from 'react';
import {
  CircleDollarSign,
  Check,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Eye,
  Filter,
} from 'lucide-react';
import RecordPaymentModal from '@/components/admin/RecordPaymentModal';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUnpaid: 0, totalPartial: 0, totalPaid: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleQuickMarkPaid = async (paymentId: string) => {
    setUpdatingId(paymentId);
    setActionMsg('');
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, paymentStatus: 'PAID' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg('✓ Pembayaran berhasil ditandai LUNAS');
        fetchPayments();
      } else {
        setActionMsg('Gagal memperbarui pembayaran.');
      }
    } catch {
      setActionMsg('Terjadi kesalahan. Coba lagi.');
    } finally {
      setUpdatingId(null);
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="badge badge-completed">
            <span className="badge-dot" />
            LUNAS
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="badge badge-diagnosing">
            <span className="badge-dot" />
            SEBAGIAN
          </span>
        );
      default:
        return (
          <span className="badge badge-pending">
            <span className="badge-dot" />
            BELUM DIBAYAR
          </span>
        );
    }
  };

  const summaryCards = [
    { label: 'Belum Dibayar', value: stats.totalUnpaid, icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    { label: 'Pembayaran Sebagian', value: stats.totalPartial, icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { label: 'Sudah Lunas', value: stats.totalPaid, icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    { label: 'Total Pendapatan', value: formatIDR(stats.totalRevenue), icon: TrendingUp, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CircleDollarSign size={22} color="#ef4444" />
            Manajemen Pembayaran
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Pencatatan manual, verifikasi tagihan, dan rekonsiliasi pembayaran customer
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchPayments} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <Plus size={14} />
            <span>Catat Pembayaran Baru</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: '24px', gap: '16px' }}>
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{card.label}</span>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontSize: typeof card.value === 'number' ? '1.6rem' : '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Cari nomor tiket atau nama customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', margin: 0, height: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Filter size={15} style={{ color: 'var(--text-subtle)', alignSelf: 'center' }} />
            {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                style={statusFilter === s ? { background: '#ef4444', border: 'none' } : {}}
              >
                {s === 'ALL' ? 'Semua' : s === 'PAID' ? 'Lunas' : s === 'PARTIAL' ? 'Sebagian' : 'Belum Bayar'}
              </button>
            ))}
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            <Search size={14} />
            <span>Cari</span>
          </button>
        </form>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: '8px', background: actionMsg.startsWith('✓') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: actionMsg.startsWith('✓') ? '#10b981' : '#ef4444', fontSize: '0.85rem', border: `1px solid ${actionMsg.startsWith('✓') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
          {actionMsg}
        </div>
      )}

      {/* Payments Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="spin" style={{ margin: '0 auto 12px auto', color: '#ef4444' }} />
            <div>Memuat data pembayaran...</div>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CircleDollarSign size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>Belum ada data pembayaran.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>No. Tiket</th>
                  <th>Customer</th>
                  <th>Perangkat</th>
                  <th>Metode Bayar</th>
                  <th>Nominal</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: '#ef4444' }}>#{p.serviceOrder?.ticketNumber}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.serviceOrder?.customer?.name || '-'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{p.serviceOrder?.customer?.phone || ''}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {p.serviceOrder?.deviceType}<br />
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.78rem' }}>{p.serviceOrder?.deviceBrand} {p.serviceOrder?.deviceModel}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{p.paymentMethod.replace(/_/g, ' ')}</td>
                    <td>
                      <strong style={{ color: '#10b981' }}>{formatIDR(p.amount)}</strong>
                      {p.serviceOrder?.quotation?.total && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                          dari {formatIDR(p.serviceOrder.quotation.total)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {p.paymentDate
                        ? new Date(p.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>{getStatusBadge(p.paymentStatus)}</td>
                    <td>
                      {p.paymentStatus !== 'PAID' ? (
                        <button
                          onClick={() => handleQuickMarkPaid(p.id)}
                          disabled={updatingId === p.id}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#10b981' }}
                        >
                          {updatingId === p.id ? (
                            <Loader2 size={12} className="spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          <span>Tandai Lunas</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                          ✓ Verified
                        </span>
                      )}
                      {p.notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.notes}>
                          📝 {p.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
