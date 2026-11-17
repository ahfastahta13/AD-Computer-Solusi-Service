'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ClipboardList,
  Wrench,
  Users,
  AlertCircle,
  TrendingUp,
  Server,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  Eye,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ServiceOrder } from '@/types';
import AdminOrderDetailModal from '@/components/admin/AdminOrderDetailModal';
import DiagnosisModal from '@/components/admin/DiagnosisModal';
import QuotationBuilderModal from '@/components/admin/QuotationBuilderModal';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    newOrders: 0,
    activeServices: 0,
    completedServices: 0,
    unpaidServices: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<ServiceOrder[]>([]);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentOrders(data.recentOrders || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="badge badge-pending"><span className="badge-dot" />SUBMITTED</span>;
      case 'DIAGNOSING':
        return <span className="badge badge-diagnosing"><span className="badge-dot" />DIAGNOSING</span>;
      case 'WAITING_APPROVAL':
        return <span className="badge badge-waiting"><span className="badge-dot" />WAITING APPROVAL</span>;
      case 'IN_PROGRESS':
      case 'IN_REPAIR':
        return <span className="badge badge-in-repair"><span className="badge-dot" />IN PROGRESS</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed"><span className="badge-dot" />COMPLETED</span>;
      case 'DELIVERED':
        return <span className="badge badge-completed" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}><span className="badge-dot" />DELIVERED</span>;
      default:
        return <span className="badge badge-pending">{status}</span>;
    }
  };

  const kpiCards = [
    {
      label: 'Total Pelanggan',
      value: stats.totalCustomers,
      unit: 'Terdaftar',
      icon: Users,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
    },
    {
      label: 'Service Orders Baru',
      value: stats.newOrders,
      unit: 'Membutuhkan Tindakan',
      icon: Clock,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      label: 'Servis Sedang Diproses',
      value: stats.activeServices,
      unit: 'Aktif di Workshop/Onsite',
      icon: Wrench,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
    },
    {
      label: 'Servis Selesai',
      value: stats.completedServices,
      unit: 'Siap Ambil / Terkirim',
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Belum Dibayar',
      value: stats.unpaidServices,
      unit: 'Tagihan Pending',
      icon: AlertCircle,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
    },
    {
      label: 'Total Pendapatan',
      value: formatIDR(stats.totalRevenue),
      unit: 'Total Terverifikasi (PAID)',
      icon: DollarSign,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
    },
  ];

  return (
    <div>
      {/* Top Banner */}
      <div
        className="card-glass"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid #ef4444',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="#ef4444" />
            Admin Control Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Selamat datang, {user?.name || 'Administrator'}. Ringkasan operasional dan servis IT real-time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchDashboardData}
            className="btn btn-secondary btn-sm"
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link href="/admin/orders" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            <Wrench size={14} />
            <span>Kelola Keluhan & Order</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '28px', gap: '16px' }}>
        {kpiCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {stat.label}
                </span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  <Icon size={18} />
                </div>
              </div>
              <div style={{ fontSize: typeof stat.value === 'number' ? '1.5rem' : '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
                {stat.unit}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Admin Grids */}
      <div className="grid-3" style={{ gap: '24px' }}>
        {/* Recent Service Orders Table (Col span 2) */}
        <div className="card" style={{ gridColumn: 'span 2', padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Antrean Service Order Terbaru
            </h3>
            <Link href="/admin/orders" className="btn btn-outline btn-sm">
              <span>Kelola Semua ({recentOrders.length})</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>No. Tracking</th>
                  <th>Customer</th>
                  <th>Perangkat</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Belum ada service order masuk.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord: any) => (
                    <tr key={ord.id}>
                      <td>
                        <strong style={{ color: '#ef4444' }}>{ord.ticketNumber}</strong>
                      </td>
                      <td>
                        <div><strong>{ord.customer?.name || ord.userName || 'Customer'}</strong></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{ord.customer?.phone || ord.userPhone || '-'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ord.deviceType}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-subtle)' }}>{ord.brand} {ord.model}</div>
                      </td>
                      <td>{getStatusBadge(ord.status)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(ord.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setIsDetailOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Architecture & Quick Links */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="#ef4444" />
            Status Dashboard System
          </h3>

          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-subtle)' }}>System Role:</span>
              <strong style={{ color: '#ef4444' }}>ADMIN CONSOLE</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Database:</span>
              <strong style={{ color: 'var(--success)' }}>Prisma SQLite Connected</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Session Security:</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ JWT HttpOnly Cookie</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-subtle)' }}>RBAC Middleware:</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>ENFORCED</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-muted)' }}>
              Aksi Cepat Admin
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/admin/orders" className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start' }}>
                <Wrench size={14} />
                <span>Kelola Status Service Order</span>
              </Link>
              <Link href="/admin/customers" className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start' }}>
                <Users size={14} />
                <span>Direktori Data Customer</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Order Detail Modal */}
      {selectedOrder && (
        <AdminOrderDetailModal
          order={selectedOrder}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedOrder(null);
          }}
          onOpenDiagnosis={(ord) => {
            setSelectedOrder(ord);
            setIsDetailOpen(false);
            setIsDiagnosisOpen(true);
          }}
          onOpenQuotation={(ord) => {
            setSelectedOrder(ord);
            setIsDetailOpen(false);
            setIsQuotationOpen(true);
          }}
          onRefresh={fetchDashboardData}
        />
      )}

      {/* Diagnosis Modal */}
      {selectedOrder && (
        <DiagnosisModal
          order={selectedOrder}
          isOpen={isDiagnosisOpen}
          onClose={() => {
            setIsDiagnosisOpen(false);
            setSelectedOrder(null);
          }}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* Quotation Builder Modal */}
      {selectedOrder && (
        <QuotationBuilderModal
          order={selectedOrder}
          isOpen={isQuotationOpen}
          onClose={() => {
            setIsQuotationOpen(false);
            setSelectedOrder(null);
          }}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
}

