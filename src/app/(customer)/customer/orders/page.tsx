'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock3,
  Laptop,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Loader2,
  Calendar,
  Wrench,
  Eye,
} from 'lucide-react';
import { ServiceOrder } from '@/types';
import OrderDetailModal from '@/components/ui/OrderDetailModal';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'PENDING':
        return { label: 'SUBMITTED', className: 'badge-pending' };
      case 'DIAGNOSING':
        return { label: 'DIAGNOSING', className: 'badge-diagnosing' };
      case 'WAITING_APPROVAL':
      case 'QUOTED':
        return { label: 'WAITING APPROVAL', className: 'badge-quoted' };
      case 'IN_PROGRESS':
      case 'IN_REPAIR':
        return { label: 'IN PROGRESS', className: 'badge-in-repair' };
      case 'READY_FOR_PICKUP':
        return { label: 'READY FOR PICKUP', className: 'badge-ready' };
      case 'COMPLETED':
        return { label: 'COMPLETED', className: 'badge-completed' };
      case 'DELIVERED':
        return { label: 'DELIVERED', className: 'badge-completed' };
      default:
        return { label: status, className: 'badge-pending' };
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const q = searchQuery.toLowerCase();
    return (
      ord.ticketNumber.toLowerCase().includes(q) ||
      ord.deviceBrand.toLowerCase().includes(q) ||
      ord.deviceModel.toLowerCase().includes(q) ||
      ord.problemDescription.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & New Booking CTA */}
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
            <Clock3 size={22} style={{ color: 'var(--primary-light)' }} />
            My Service Orders (Daftar Servis Saya)
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Pantau status pengerjaan, rincian tiket, dan riwayat perbaikan perangkat komputer Anda secara real-time.
          </p>
        </div>

        <Link href="/customer/services/booking" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PlusCircle size={16} />
          <span>Booking Servis Baru</span>
        </Link>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', maxWidth: '420px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari no. tiket / merk / keluhan..."
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

      {/* Orders List Table / Cards */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-light)' }} />
          <span>Memuat daftar tiket servis...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Laptop size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>Belum ada tiket order servis yang ditemukan.</p>
          <Link href="/customer/services/booking" className="btn btn-primary btn-sm">
            <PlusCircle size={14} />
            <span>Buat Order Servis Baru</span>
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>No. Tiket</th>
                  <th>Perangkat</th>
                  <th>Keluhan</th>
                  <th>Penanganan</th>
                  <th>Tanggal Didaftarkan</th>
                  <th>Status Workflow</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const badge = getStatusBadge(ord.status);
                  return (
                    <tr key={ord.id}>
                      <td>
                        <strong style={{ color: 'var(--primary-light)', fontSize: '0.9rem' }}>
                          #{ord.ticketNumber}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>
                          {ord.deviceBrand} {ord.deviceModel}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          {ord.deviceType}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ord.problemDescription}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontSize: '0.82rem', fontWeight: 600 }}>
                          {ord.serviceType}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(ord.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={`badge ${badge.className}`}>
                          <span className="badge-dot" />
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
