'use client';

import React from 'react';
import { X, Clock, Tag, CheckCircle2, ArrowRight, ShieldCheck, Wrench } from 'lucide-react';
import { Service } from '@/types';
import Link from 'next/link';

interface ServiceDetailModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ServiceDetailModal({ service, isOpen, onClose }: ServiceDetailModalProps) {
  if (!isOpen || !service) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 22, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '28px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          animation: 'fadeIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-glass)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--primary-light)',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            <Tag size={12} />
            <span>{service.category}</span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
            {service.name}
          </h2>
        </div>

        {/* Info Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '4px' }}>Biaya Mulai Dari</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-light)' }}>
              {formatPrice(service.priceFrom)}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '4px' }}>Estimasi Pengerjaan (SLA)</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--warning)" />
              <span>{service.estimatedDuration}</span>
            </div>
          </div>
        </div>

        {/* Service Scope Description */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>
            Deskripsi & Cakupan Layanan:
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {service.description}
          </p>
        </div>

        {/* Guarantees */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            fontSize: '0.82rem',
            color: '#34d399',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span>Layanan dilindungi Garansi Resmi Servis & Privasi Data Terjamin 100%.</span>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
            Tutup
          </button>
          <Link
            href={`/customer/services?selected=${service.id}`}
            className="btn btn-primary"
            style={{ flex: 2, justifyContent: 'center' }}
            onClick={onClose}
          >
            <Wrench size={16} />
            <span>Book Service Ini</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
