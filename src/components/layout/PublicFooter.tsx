import React from 'react';
import Link from 'next/link';
import { Cpu, Phone, Mail, MapPin, Clock, ShieldCheck, HeartHandshake } from 'lucide-react';
import { APP_CONFIG } from '@/lib/config';

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="container">
        <div className="grid-4" style={{ marginBottom: '48px' }}>
          {/* Col 1: Brand & Tagline */}
          <div>
            <div className="brand-logo" style={{ marginBottom: '16px' }}>
              <div className="brand-icon">
                <Cpu size={20} />
              </div>
              <div>
                <span>IT Service</span>
                <span style={{ color: 'var(--primary-light)', fontSize: '0.85em', display: 'block', fontWeight: 400 }}>
                  Business System
                </span>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6' }}>
              {APP_CONFIG.tagline}
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontSize: '0.95rem' }}>
              Navigasi Utama
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Beranda</Link>
              </li>
              <li>
                <Link href="/services" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Katalog Layanan IT</Link>
              </li>
              <li>
                <Link href="/track" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Lacak Status Servis</Link>
              </li>
              <li>
                <Link href="/customer/ai-assistant" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>AI IT Assistant</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontSize: '0.95rem' }}>
              Akses Portal
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link href="/customer/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Customer Dashboard</Link>
              </li>
              <li>
                <Link href="/customer/services" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Buat Booking Servis</Link>
              </li>
              <li>
                <Link href="/admin/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Admin Console</Link>
              </li>
              <li>
                <Link href="/admin/orders" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Manajemen Service Order</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Hours */}
          <div>
            <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontSize: '0.95rem' }}>
              Kontak & Operasional
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <MapPin size={16} color="var(--primary-light)" />
                <span>{APP_CONFIG.company.address}</span>
              </li>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Phone size={16} color="var(--primary-light)" />
                <a
                  href={`https://wa.me/${APP_CONFIG.company.whatsappNumber}?text=${encodeURIComponent('Halo Admin AD Computer, saya ingin berkonsultasi mengenai layanan IT / servis komputer.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                >
                  {APP_CONFIG.company.phone} (WhatsApp)
                </a>
              </li>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Mail size={16} color="var(--primary-light)" />
                <span>{APP_CONFIG.company.email}</span>
              </li>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Clock size={16} color="var(--primary-light)" />
                <span>{APP_CONFIG.company.hours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
            © 2026 {APP_CONFIG.name}. Modern Production-Ready Architecture MVP.
          </p>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security</span>
          </div>
        </div>

        {/* Created By */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
            Created by <strong style={{ color: 'var(--primary-light)' }}>Ahfas Tahta Sunaedi</strong>
          </p>
        </div>
      </div>
    </footer>
  );
}
