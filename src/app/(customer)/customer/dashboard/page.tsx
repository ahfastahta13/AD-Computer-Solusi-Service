'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Clock3,
  FileText,
  CreditCard,
  Bot,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Laptop,
  Loader2,
  Calendar,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ServiceOrder } from '@/types';

export default function CustomerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/customer/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customer orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  const latestOrder = orders.length > 0 ? orders[0] : null;
  const historyOrders = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED');

  const pendingQuotations = orders.filter(
    (o) => o.quotation && (o.quotation.status === 'DRAFT' || o.quotation.status === 'SENT')
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Menunggu Diagnosa', className: 'badge-pending' };
      case 'DIAGNOSING':
        return { label: 'Sedang Diagnosa', className: 'badge-diagnosing' };
      case 'QUOTED':
        return { label: 'Penawaran Siap', className: 'badge-quoted' };
      case 'IN_REPAIR':
        return { label: 'Sedang Dikerjakan (In Repair)', className: 'badge-in-repair' };
      case 'READY_FOR_PICKUP':
        return { label: 'Siap Diambil / Selesai', className: 'badge-ready' };
      case 'COMPLETED':
        return { label: 'Selesai', className: 'badge-completed' };
      default:
        return { label: status, className: 'badge-pending' };
    }
  };

  if (authLoading || loadingOrders) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-light)' }} />
        <span>Memuat dashboard customer...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        className="card-glass"
        style={{
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--primary-light)',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
            Selamat Datang Kembali, {user?.name || 'Pelanggan'}! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Pantau status pengerjaan unit servis Anda, riwayat transaksi, dan konsultasi IT terkini.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/customer/services" className="btn btn-primary">
            <PlusCircle size={16} />
            <span>Booking Service</span>
          </Link>
          <Link href="/customer/ai-assistant" className="btn btn-secondary">
            <Bot size={16} />
            <span>Chat dengan AI</span>
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid-4" style={{ gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Servis Aktif</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
              <Clock3 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {activeOrders.length} Unit
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Penawaran Biaya</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {pendingQuotations.length} Pending
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Riwayat Servis</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {historyOrders.length} Selesai
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>AI IT Consultant</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
              <Bot size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Active
          </div>
        </div>
      </div>

      {/* Main Section: Active Service & Recent Status */}
      <div className="grid-2" style={{ gap: '24px' }}>
        {/* Active Service Order */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Laptop size={18} style={{ color: 'var(--primary-light)' }} />
              Servis Aktif Saat Ini
            </h3>
            {latestOrder && (
              <span className={`badge ${getStatusBadge(latestOrder.status).className}`}>
                <span className="badge-dot" />
                {getStatusBadge(latestOrder.status).label}
              </span>
            )}
          </div>

          {latestOrder ? (
            <div>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', marginBottom: '16px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                    {latestOrder.deviceBrand} {latestOrder.deviceModel}
                  </strong>
                  <span style={{ color: 'var(--primary-light)', fontWeight: 700, fontSize: '0.85rem' }}>
                    {latestOrder.ticketNumber}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  <strong>Keluhan:</strong> {latestOrder.problemDescription}
                </p>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} />
                  <span>Didaftarkan: {new Date(latestOrder.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Progress bar simulation */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Progress Penanganan</span>
                  <span>{latestOrder.status === 'COMPLETED' ? '100%' : latestOrder.status === 'IN_REPAIR' ? '65%' : '30%'}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: latestOrder.status === 'COMPLETED' ? '100%' : latestOrder.status === 'IN_REPAIR' ? '65%' : '30%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                    }}
                  />
                </div>
              </div>

              <Link href="/customer/orders" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                <span>Lihat Detail Timeline Lengkap</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Laptop size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>Belum ada servis yang sedang berjalan.</p>
              <Link href="/customer/services" className="btn btn-primary btn-sm">
                <PlusCircle size={14} />
                <span>Buat Pengajuan Servis</span>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Action & AI Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Actions Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>
              Akses Pintar & Layanan Fast-Track
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/customer/services"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Wrench size={20} style={{ color: 'var(--primary-light)' }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block' }}>Katalog Layanan & Book Service</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Lihat 8 kategori layanan komputer & IT</span>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-subtle)' }} />
              </Link>

              <Link
                href="/customer/ai-assistant"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bot size={20} style={{ color: '#c084fc' }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block', color: '#e9d5ff' }}>Konsultasi AI IT Assistant</strong>
                    <span style={{ fontSize: '0.78rem', color: '#c084fc' }}>Tanya diagnosa awal & solusi problem komputer</span>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: '#c084fc' }} />
              </Link>
            </div>
          </div>

          {/* Guarantee Banner */}
          <div
            className="card"
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <ShieldCheck size={28} style={{ color: '#34d399', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.9rem', color: '#34d399', display: 'block', marginBottom: '2px' }}>
                Garansi Resmi & Transparansi Biaya
              </strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Setiap perbaikan disertai estimasi Quotation tertulis sebelum pengerjaan dan garansi suku cadang hingga 90 hari.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Order History List */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Riwayat & Daftar Pengajuan Servis
          </h3>
          <Link href="/customer/orders" style={{ fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>
            Lihat Semua Order →
          </Link>
        </div>

        {orders.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '20px 0' }}>
            Belum ada riwayat order servis.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.map((ord) => {
              const badge = getStatusBadge(ord.status);
              return (
                <div
                  key={ord.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {ord.deviceBrand} {ord.deviceModel}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                        ({ord.ticketNumber})
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                      {ord.problemDescription}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge ${badge.className}`}>
                      <span className="badge-dot" />
                      {badge.label}
                    </span>
                    <Link href="/customer/orders" className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>
                      Detail
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
