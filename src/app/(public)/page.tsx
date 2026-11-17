'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Shield,
  Cpu,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  Bot,
  Layers,
  Database,
  BarChart3,
  Users,
} from 'lucide-react';
import { APP_CONFIG } from '@/lib/config';
import Chatbot from '@/components/ui/Chatbot';

export default function HomePage() {
  const router = useRouter();
  const [trackInput, setTrackInput] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackInput.trim()) {
      router.push(`/track?code=${encodeURIComponent(trackInput.trim())}`);
    } else {
      router.push('/track');
    }
  };

  const services = [
    {
      icon: Cpu,
      title: 'Hardware Diagnostics & Repair',
      desc: 'Perbaikan motherboard, pergantian layar LCD, keyboard, baterai, upgrade SSD/RAM.',
      badge: 'Populer',
    },
    {
      icon: Zap,
      title: 'OS & Software Optimization',
      desc: 'Instalasi OS resmi, pembersihan malware/virus, software CAD/Editing, tune-up performa.',
      badge: 'Fast Service',
    },
    {
      icon: Shield,
      title: 'Network & IT Infrastructure',
      desc: 'Pemasangan jaringan LAN/Wi-Fi kantor, mikrotik routing, VPN, dan instalasi CCTV IP.',
      badge: 'B2B & B2C',
    },
    {
      icon: Bot,
      title: 'AI Smart IT Troubleshooting',
      desc: 'Konsultasi dan estimasi kerusakan secara instan dengan kecerdasan buatan terpadu.',
      badge: 'New Feature',
    },
  ];

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Radial Glow Effect */}
      <div className="bg-glow-radial" />

      {/* Hero Section */}
      <section style={{ padding: '80px 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div className="container" style={{ textAlign: 'center' }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--primary-light)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '24px',
            }}
          >
            <Sparkles size={16} />
            <span>Platform Service Komputer & Solusi Bisnis IT Terpadu</span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '20px',
              letterSpacing: '-0.02em',
            }}
          >
            Solusi Servis IT Cepat, <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Transparan & Terintegrasi AI
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--text-muted)',
              maxWidth: '720px',
              margin: '0 auto 40px auto',
              lineHeight: 1.6,
            }}
          >
            Layanan perbaikan komputer, laptop, dan infrastruktur IT bisnis dengan pelacakan status
            real-time, penawaran harga jelas, dan asisten pintar.
          </p>

          {/* Quick Tracking Widget */}
          <div
            style={{
              maxWidth: '560px',
              margin: '0 auto 48px auto',
              background: 'var(--bg-glass-card)',
              backdropFilter: 'blur(16px)',
              padding: '8px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-active)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '12px', flex: 1 }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Masukkan Nomor Tracking (contoh: SRV-2026-001)..."
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '12px',
                    color: 'var(--text-main)',
                    width: '100%',
                    outline: 'none',
                    fontSize: '0.92rem',
                  }}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <span>Lacak Servis</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/customer/dashboard" className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <Wrench size={18} />
              <span>Masuk Customer Portal</span>
            </Link>
            <Link href="/admin/dashboard" className="btn btn-secondary" style={{ padding: '12px 24px' }}>
              <Shield size={18} />
              <span>Buka Admin Console</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section style={{ borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)', background: 'rgba(15, 23, 42, 0.4)', padding: '28px 0' }}>
        <div className="container">
          <div className="grid-4" style={{ textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-light)' }}>2,400+</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Perangkat Diperbaiki</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>98.8%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tingkat Kepuasan Pelanggan</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)' }}>2 Jam</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rata-rata Estimasi Diagnosa</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--purple)' }}>100%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Garansi Sparepart Resmi</div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Architecture Highlight */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '12px' }}>
              Sistem Terintegrasi 2 Role Utama
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
              Arsitektur berbasis role terpisah untuk memberikan pengalaman self-service bagi pelanggan dan operasional efisien bagi manajemen IT.
            </p>
          </div>

          <div className="grid-2">
            {/* Customer Role Card */}
            <div className="card" style={{ borderTop: '4px solid var(--primary-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                  <Users size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Customer Portal</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary-light)' }}>Pelanggan / Bisnis Klien</span>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Akses mandiri untuk booking reparasi, memantau pengerjaan secara transparan, konfirmasi penawaran biaya (quotation), pembayaran, dan tanya jawab dengan AI.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Buat Booking & Request Pickup/Drop-off</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Timeline Status Servis Real-time</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Persetujuan Quotation & Invoice Digital</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>AI Troubleshooting Assistant 24/7</span>
                </li>
              </ul>
              <Link href="/customer/dashboard" className="btn btn-primary" style={{ width: '100%' }}>
                <span>Buka Customer View</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Admin Role Card */}
            <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Admin Console</h3>
                  <span style={{ fontSize: '0.8rem', color: '#f87171' }}>Manajemen & Operasional</span>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Pusat kendali operasional bisnis: monitor antrean pengerjaan teknisi, pembuatan invoice & penawaran harga, verifikasi pembayaran, serta konfigurasi AI bot.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="var(--primary-light)" />
                  <span>Dashboard KPI & Ringkasan Pendapatan</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--primary-light)"' }} />
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={16} color="var(--primary-light)" />
                  <span>Manajemen Service Orders & Update Status</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--primary-light)' }}>
                  <CheckCircle2 size={16} color="var(--primary-light)" />
                  <span>Pembuatan Quotation & Itemized Billing</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--primary-light)' }}>
                  <CheckCircle2 size={16} color="var(--primary-light)" />
                  <span>Verifikasi Pembayaran & Rekonsiliasi</span>
                </li>
              </ul>
              <Link href="/admin/dashboard" className="btn btn-secondary" style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <span>Buka Admin Console</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section style={{ padding: '60px 0 80px 0', background: 'rgba(15, 23, 42, 0.2)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>
                Katalog Layanan IT Utama
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Berbagai solusi perbaikan komputer, laptop, dan kebutuhan IT bisnis Anda.
              </p>
            </div>
            <Link href="/services" className="btn btn-outline btn-sm">
              <span>Lihat Semua Layanan</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid-4">
            {services.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                      <Icon size={22} />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)' }}>
                      {item.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '10px' }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.5' }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  );
}
