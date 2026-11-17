'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Building2,
  QrCode,
  Loader2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';

export default function CustomerPaymentsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalOrders: 0, totalPaid: 0, totalRemaining: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer/payments');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setSummary(data.summary || {});
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);

  const getPaymentStatusBadge = (status: string) => {
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

  const getPaymentMethodLabel = (method: string) => {
    const map: Record<string, string> = {
      CASH: 'Tunai (Cash)',
      TRANSFER_BCA: 'Transfer BCA',
      TRANSFER_MANDIRI: 'Transfer Mandiri',
      TRANSFER_BRI: 'Transfer BRI',
      TRANSFER_BNI: 'Transfer BNI',
      QRIS: 'QRIS',
      DEBIT: 'Kartu Debit',
      KREDIT: 'Kartu Kredit',
      TRANSFER_BANK: 'Transfer Bank',
    };
    return map[method] || method;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-light)' }} />
        <span>Memuat data pembayaran...</span>
      </div>
    );
  }

  const ordersWithQuotation = orders.filter((o) => o.quotation);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={22} style={{ color: 'var(--primary-light)' }} />
          Pembayaran & Invoice Servis
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Rincian tagihan, saldo, dan riwayat pembayaran seluruh servis Anda
        </p>
      </div>

      {/* Global Summary Cards */}
      <div className="grid-3" style={{ gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Sudah Dibayar</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{formatIDR(summary.totalPaid)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Total pembayaran terverifikasi</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sisa Tagihan</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: summary.totalRemaining > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: summary.totalRemaining > 0 ? '#ef4444' : '#10b981' }}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: summary.totalRemaining > 0 ? '#ef4444' : '#10b981' }}>
            {formatIDR(summary.totalRemaining)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
            {summary.totalRemaining > 0 ? 'Perlu segera dilunasi' : '✓ Semua tagihan lunas'}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Order</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{summary.totalOrders}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Total transaksi servis</div>
        </div>
      </div>

      {/* Per-Order Payment Detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
          Rincian Per-Tiket Servis
        </h3>

        {ordersWithQuotation.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Belum ada tagihan yang perlu dibayar.</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.83rem', color: 'var(--text-subtle)' }}>
              Tagihan muncul setelah admin membuat quotation dan Anda menyetujuinya.
            </p>
          </div>
        ) : (
          ordersWithQuotation.map((order: any) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Order Header */}
                <div
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid var(--border-glass)' : 'none',
                  }}
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Receipt size={18} color="var(--primary-light)" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: 'var(--primary-light)' }}>#{order.ticketNumber}</strong>
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {order.deviceType} — {order.deviceBrand} {order.deviceModel}
                      </div>
                    </div>
                  </div>

                  {/* Balance Summary */}
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Total Tagihan</div>
                      <div style={{ fontWeight: 700 }}>{formatIDR(order.totalQuotation)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Sudah Dibayar</div>
                      <div style={{ fontWeight: 700, color: '#10b981' }}>{formatIDR(order.totalPaid)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Sisa</div>
                      <div style={{ fontWeight: 700, color: order.remainingBalance > 0 ? '#ef4444' : '#10b981' }}>
                        {formatIDR(order.remainingBalance)}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded: Payment History */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Riwayat Pembayaran
                    </div>

                    {order.payments.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-subtle)', background: 'var(--bg-surface)', borderRadius: '8px' }}>
                        Belum ada pembayaran yang dicatat untuk order ini.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {order.payments.map((payment: any) => (
                          <div
                            key={payment.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 14px',
                              borderRadius: '8px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-glass)',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                {formatIDR(payment.amount)}
                              </div>
                              <div style={{ fontSize: '0.77rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                                {getPaymentMethodLabel(payment.paymentMethod)}
                                {payment.paymentDate && ` · ${new Date(payment.paymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                              </div>
                              {payment.notes && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                                  📝 {payment.notes}
                                </div>
                              )}
                            </div>
                            <div>
                              {payment.paymentStatus === 'PAID' ? (
                                <span className="badge badge-completed"><span className="badge-dot" />LUNAS</span>
                              ) : payment.paymentStatus === 'PARTIAL' ? (
                                <span className="badge badge-diagnosing"><span className="badge-dot" />SEBAGIAN</span>
                              ) : (
                                <span className="badge badge-pending"><span className="badge-dot" />BELUM LUNAS</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Balance Bar */}
                    {order.totalQuotation > 0 && (
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>
                          <span>Progress Pelunasan</span>
                          <span>{Math.round((order.totalPaid / order.totalQuotation) * 100)}%</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '4px', background: 'var(--bg-surface)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              borderRadius: '4px',
                              background: order.remainingBalance === 0
                                ? 'linear-gradient(90deg, #10b981, #059669)'
                                : 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
                              width: `${Math.min(100, (order.totalPaid / order.totalQuotation) * 100)}%`,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Payment Info Section */}
      <div className="grid-2" style={{ gap: '20px', marginTop: '28px' }}>
        {/* Payment Methods */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="var(--primary-light)" />
            Metode Pembayaran Resmi
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '0.88rem' }}>Bank BCA</strong>
                <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary-light)' }}>Transfer</span>
              </div>
              <div style={{ fontFamily: 'monospace', color: 'var(--primary-light)', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                8830 1928 3847 2200
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>a.n. IT Service Business System</div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '0.88rem' }}>QRIS Universal</strong>
                <QrCode size={16} color="var(--primary-light)" />
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                GoPay · OVO · Dana · ShopeePay · LinkAja · Mobile Banking
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '0.88rem' }}>Tunai (Cash)</strong>
                <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Di Counter</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Bayar langsung saat pengambilan perangkat di workshop.
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--warning)" />
            Cara Konfirmasi Pembayaran
          </h3>
          <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              'Setujui quotation yang dikirim admin di halaman Quotations.',
              'Lakukan pembayaran sesuai nominal via metode yang tersedia.',
              'Hubungi admin / WhatsApp untuk konfirmasi bukti transfer.',
              'Admin akan memverifikasi dan mencatat pembayaran dalam sistem.',
              'Status tagihan Anda akan berubah menjadi LUNAS secara otomatis.',
            ].map((step, i) => (
              <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {step}
              </li>
            ))}
          </ol>
          <div style={{ marginTop: '16px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.8rem', color: 'var(--primary-light)' }}>
            💡 <strong>Tips:</strong> Cek halaman Notifications untuk konfirmasi pembayaran yang masuk.
          </div>
        </div>
      </div>
    </div>
  );
}
