import React from 'react';
import Link from 'next/link';
import { Cpu, HardDrive, Monitor, Wifi, ShieldAlert, Laptop, Server, CheckCircle, ArrowRight } from 'lucide-react';

export default function ServicesPage() {
  const serviceList = [
    {
      id: 'srv-1',
      title: 'Diagnosa & Perbaikan Hardware Laptop/PC',
      category: 'Hardware Repair',
      icon: Laptop,
      price: 'Mulai Rp 150.000',
      duration: '1 - 3 Hari Kerja',
      features: ['Motherboard chip-level repair', 'Ganti LCD / Keyboard / Baterai', 'Pembersihan Thermal Paste & Fan'],
    },
    {
      id: 'srv-2',
      title: 'Upgrade Komponen & Speed-Up',
      category: 'Hardware Upgrade',
      icon: Cpu,
      price: 'Mulai Rp 200.000',
      duration: 'Sama hari (Same-Day)',
      features: ['Upgrade NVMe / SSD High-Speed', 'Penambahan RAM Dual-Channel', 'Migrasi & Kloning Data Tanpa Hilang'],
    },
    {
      id: 'srv-3',
      title: 'Instalasi & Konfigurasi Software OS',
      category: 'Software Solution',
      icon: Monitor,
      price: 'Mulai Rp 100.000',
      duration: '2 - 4 Jam',
      features: ['Instalasi Windows 11 / macOS / Linux', 'Pembersihan Virus, Trojan & Adware', 'Driver & Software Utility Lengkap'],
    },
    {
      id: 'srv-4',
      title: 'Setup Jaringan & Server Kantor (SME)',
      category: 'Network & Infrastructure',
      icon: Server,
      price: 'Mulai Rp 500.000',
      duration: 'Sesuai Scope Project',
      features: ['Pemasangan Router Mikrotik & Switch', 'Konfigurasi Wi-Fi Mesh & Bandwidth', 'File Server & Backup Otomatis'],
    },
  ];

  return (
    <div style={{ padding: '60px 0 80px 0' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <span className="badge badge-in-repair" style={{ marginBottom: '12px' }}>
            Katalog Lengkap
          </span>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '16px' }}>
            Layanan IT & Service Komputer
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto' }}>
            Pilih layanan yang Anda butuhkan. Kami menjamin transparansi biaya diagnosa dan keaslian sparepart dengan garansi resmi.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid-2" style={{ gap: '24px', marginBottom: '60px' }}>
          {serviceList.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                    <Icon size={24} />
                  </div>
                  <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                    {service.category}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>{service.title}</h3>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                  <span>{service.price}</span>
                  <span style={{ color: 'var(--text-subtle)' }}>•</span>
                  <span style={{ color: 'var(--text-muted)' }}>Estimasi: {service.duration}</span>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', flex: 1 }}>
                  {service.features.map((feat, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      <CheckCircle size={14} color="var(--success)" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/customer/services" className="btn btn-primary" style={{ width: '100%' }}>
                  <span>Booking Layanan Ini</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Banner */}
        <div className="card-glass" style={{ padding: '40px', textAlign: 'center', border: '1px solid var(--border-active)' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>
            Bingung masalah komputer atau IT kantor Anda?
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
            Gunakan fitur AI IT Assistant untuk diagnosa awal secara mandiri atau konsultasi langsung dengan teknisi kami.
          </p>
          <Link href="/customer/ai-assistant" className="btn btn-primary">
            <span>Coba AI IT Assistant</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
