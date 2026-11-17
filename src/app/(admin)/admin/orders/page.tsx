'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Loader2,
  FileText,
  Receipt,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Laptop,
} from 'lucide-react';
import { ServiceOrder } from '@/types';
import DiagnosisModal from '@/components/admin/DiagnosisModal';
import QuotationBuilderModal from '@/components/admin/QuotationBuilderModal';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeDiagnosisOrder, setActiveDiagnosisOrder] = useState<ServiceOrder | null>(null);
  const [activeQuotationOrder, setActiveQuotationOrder] = useState<ServiceOrder | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
        );
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const q = searchQuery.toLowerCase();
    return (
      ord.ticketNumber.toLowerCase().includes(q) ||
      (ord.customer?.name && ord.customer.name.toLowerCase().includes(q)) ||
      ord.deviceBrand.toLowerCase().includes(q) ||
      ord.deviceModel.toLowerCase().includes(q) ||
      ord.problemDescription.toLowerCase().includes(q)
    );
  });

  const formatPrice = (price?: number | null) => {
    if (!price) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
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
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={22} style={{ color: '#f87171' }} />
            Manajemen Tiket & Order Servis
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Input hasil diagnosa teknis lab, buat surat penawaran biaya (quotation), dan perbarui status pengerjaan unit.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: '420px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari no. tiket / customer / merk..."
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

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#f87171' }} />
          <span>Memuat data order servis...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Laptop size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Tidak ada order servis yang ditemukan.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>No. Tiket</th>
                  <th>Customer</th>
                  <th>Perangkat</th>
                  <th>Keluhan</th>
                  <th>Update Status Workflow</th>
                  <th>Diagnosa & Quotation</th>
                  <th>Biaya</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <strong style={{ color: '#f87171', fontSize: '0.9rem' }}>#{ord.ticketNumber}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        {new Date(ord.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ord.customer?.name || 'Customer'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{ord.customer?.phone || ord.customer?.email}</div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.85rem' }}>{ord.deviceBrand} {ord.deviceModel}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'capitalize' }}>{ord.serviceType}</div>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ord.problemDescription}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto', background: 'var(--bg-surface)' }}
                      >
                        <option value="SUBMITTED">SUBMITTED (Dikirim)</option>
                        <option value="DIAGNOSING">DIAGNOSING (Diagnosa)</option>
                        <option value="WAITING_APPROVAL">WAITING_APPROVAL (Menunggu Approval)</option>
                        <option value="IN_PROGRESS">IN_PROGRESS (Pengerjaan)</option>
                        <option value="COMPLETED">COMPLETED (Selesai)</option>
                        <option value="DELIVERED">DELIVERED (Diambil)</option>
                        <option value="CANCELLED">CANCELLED (Batal)</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDiagnosisOrder(ord)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--primary-light)' }}
                        >
                          <FileText size={12} />
                          <span>Diagnosa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveQuotationOrder(ord)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: 'var(--warning)' }}
                        >
                          <Receipt size={12} />
                          <span>Quote</span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                        {formatPrice(ord.quotation?.total || ord.diagnosis?.estimatedCost)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Modals */}
      <DiagnosisModal
        order={activeDiagnosisOrder}
        isOpen={!!activeDiagnosisOrder}
        onClose={() => setActiveDiagnosisOrder(null)}
        onSuccess={fetchOrders}
      />

      <QuotationBuilderModal
        order={activeQuotationOrder}
        isOpen={!!activeQuotationOrder}
        onClose={() => setActiveQuotationOrder(null)}
        onSuccess={fetchOrders}
      />
    </div>
  );
}
