'use client';

import React, { useState, useEffect } from 'react';
import {
  Laptop,
  HardDrive,
  DownloadCloud,
  Network,
  Database,
  Headphones,
  Video,
  MessagesSquare,
  Search,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { Service } from '@/types';
import ServiceDetailModal from '@/components/ui/ServiceDetailModal';

export default function CustomerServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeModalService, setActiveModalService] = useState<Service | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setServices(data.services || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch services', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const categories = [
    { key: 'ALL', label: 'Semua Layanan' },
    { key: 'Computer/Laptop Service', label: 'Computer/Laptop Service' },
    { key: 'Install/Reinstall OS', label: 'Install/Reinstall OS' },
    { key: 'Upgrade RAM/SSD', label: 'Upgrade RAM/SSD' },
    { key: 'Data Recovery', label: 'Data Recovery' },
    { key: 'Network/WiFi', label: 'Network/WiFi' },
    { key: 'IT Support', label: 'IT Support' },
    { key: 'CCTV', label: 'CCTV' },
    { key: 'IT Consultation', label: 'IT Consultation' },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Computer/Laptop Service':
        return <Laptop size={22} style={{ color: 'var(--primary-light)' }} />;
      case 'Upgrade RAM/SSD':
        return <HardDrive size={22} style={{ color: 'var(--accent-cyan)' }} />;
      case 'Install/Reinstall OS':
        return <DownloadCloud size={22} style={{ color: 'var(--success)' }} />;
      case 'Network/WiFi':
        return <Network size={22} style={{ color: 'var(--info)' }} />;
      case 'Data Recovery':
        return <Database size={22} style={{ color: 'var(--warning)' }} />;
      case 'IT Support':
        return <Headphones size={22} style={{ color: '#a855f7' }} />;
      case 'CCTV':
        return <Video size={22} style={{ color: '#f43f5e' }} />;
      case 'IT Consultation':
        return <MessagesSquare size={22} style={{ color: '#eab308' }} />;
      default:
        return <Wrench size={22} style={{ color: 'var(--primary-light)' }} />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const filteredServices = services.filter((srv) => {
    const matchesCategory = selectedCategory === 'ALL' || srv.category === selectedCategory;
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="card-glass"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
          borderLeft: '4px solid var(--primary-light)',
        }}
      >
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
          Katalog Layanan & Service Komputer Professional 🛠️
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Pilih dari 8 kategori layanan IT komprehensif dengan estimasi biaya transparan dan penanganan garansi resmi.
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', maxWidth: '480px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Cari layanan (contoh: OS, SSD, Mikrotik, CCTV...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px', background: 'var(--bg-card)' }}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)',
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'thin' }}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: selectedCategory === cat.key ? '1px solid var(--primary-light)' : '1px solid var(--border-glass)',
                background: selectedCategory === cat.key ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                color: selectedCategory === cat.key ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-light)' }} />
          <span>Memuat katalog layanan...</span>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Wrench size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Tidak ada layanan yang sesuai dengan pencarian Anda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 0.25s ease',
              }}
            >
              <div>
                {/* Header Icon & Category Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getCategoryIcon(srv.category)}
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-subtle)',
                    }}
                  >
                    {srv.category}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
                  {srv.name}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px', minHeight: '50px' }}>
                  {srv.description}
                </p>
              </div>

              <div>
                {/* Price & SLA Box */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-glass)',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Mulai Dari</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary-light)' }}>
                      {formatPrice(srv.priceFrom)}
                    </strong>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-subtle)' }}>SLA Estimasi</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="var(--warning)" />
                      {srv.estimatedDuration}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalService(srv)}
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                  >
                    Detail
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalService(srv)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.5, justifyContent: 'center' }}
                  >
                    <Wrench size={14} />
                    <span>Book Service</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Detail Modal */}
      <ServiceDetailModal
        service={activeModalService}
        isOpen={!!activeModalService}
        onClose={() => setActiveModalService(null)}
      />
    </div>
  );
}
