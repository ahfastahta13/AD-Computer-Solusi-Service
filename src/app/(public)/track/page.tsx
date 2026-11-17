'use client';

import React, { useState } from 'react';
import { Search, CheckCircle2, Clock, Wrench, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function TrackPage() {
  const [code, setCode] = useState('SRV-2026-001');
  const [searched, setSearched] = useState(true);

  const sampleOrder = {
    trackingCode: 'SRV-2026-001',
    customerName: 'Budi Pratama',
    device: 'Laptop Asus ROG Strix G15',
    issue: 'Overheating mendadak saat render & fan berbunyi bising',
    status: 'IN_REPAIR',
    receivedAt: '28 Agustus 2026, 09:30 WIB',
    technician: 'Rian Hardware Specialist',
    timeline: [
      { step: 'Diterima & Registrasi', date: '28 Agu, 09:30 WIB', done: true, desc: 'Perangkat diterima di counter servis dan dicatat keluhan.' },
      { step: 'Diagnosa Awal Teknisi', date: '28 Agu, 11:00 WIB', done: true, desc: 'Pemeriksaan pasta pendingin kering dan bearing fan tersumbat debu.' },
      { step: 'Quotation Disetujui', date: '28 Agu, 13:15 WIB', done: true, desc: 'Pelanggan menyetujui penggantian thermal paste Honeywell PTM7950 & fan baru.' },
      { step: 'Proses Pengerjaan (In Repair)', date: 'Sedang Berjalan', done: true, current: true, desc: 'Teknisi sedang melakukan penggantian modul fan dan repasting.' },
      { step: 'Quality Control & Testing', date: 'Estimasi: Hari ini 17:00 WIB', done: false, desc: 'Stress test benchmark suhu CPU/GPU selama 30 menit.' },
      { step: 'Siap Diambil / Diantar', date: 'Menunggu QC Selesai', done: false, desc: 'Notifikasi akan dikirimkan ke WhatsApp pelanggan.' },
    ],
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div style={{ padding: '60px 0 80px 0' }}>
      <div className="container" style={{ maxWidth: '840px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '12px' }}>
            Lacak Status Servis Perangkat
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Pantau setiap tahapan diagnosa dan perbaikan perangkat Anda secara transparan dan real-time.
          </p>
        </div>

        {/* Search Bar */}
        <div className="card" style={{ marginBottom: '32px', padding: '16px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: SRV-2026-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            <button type="submit" className="btn btn-primary">
              <span>Cari Status</span>
            </button>
          </form>
        </div>

        {/* Order Details & Timeline Card */}
        {searched && (
          <div className="card" style={{ borderTop: '4px solid var(--primary-light)' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <span className="badge badge-in-repair" style={{ marginBottom: '8px' }}>
                  <span className="badge-dot" />
                  Sedang Dikerjakan (In Repair)
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{sampleOrder.trackingCode}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{sampleOrder.device}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Teknisi Penanggung Jawab</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>{sampleOrder.technician}</div>
              </div>
            </div>

            {/* Issue summary */}
            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', margin: '20px 0', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginBottom: '4px' }}>Keluhan Masalah:</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{sampleOrder.issue}</div>
            </div>

            {/* Timeline Progress */}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>
              Progress Pengerjaan Servis
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sampleOrder.timeline.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: item.current ? 'var(--primary)' : item.done ? 'var(--success)' : 'var(--bg-surface)',
                        border: item.current ? '2px solid var(--primary-light)' : item.done ? 'none' : '1px solid var(--border-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        boxShadow: item.current ? 'var(--shadow-glow)' : 'none',
                      }}
                    >
                      {item.done ? '✓' : idx + 1}
                    </div>
                    {idx < sampleOrder.timeline.length - 1 && (
                      <div
                        style={{
                          width: '2px',
                          flex: 1,
                          background: item.done ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-glass)',
                          margin: '4px 0',
                          minHeight: '24px',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: idx < sampleOrder.timeline.length - 1 ? '16px' : '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: item.current ? 'var(--primary-light)' : 'var(--text-main)' }}>
                        {item.step}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{item.date}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Portal Link */}
            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Ingin melihat invoice atau menyetujui quotation biaya?
              </span>
              <Link href="/customer/quotations" className="btn btn-outline btn-sm">
                <span>Buka Quotation di Portal</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
