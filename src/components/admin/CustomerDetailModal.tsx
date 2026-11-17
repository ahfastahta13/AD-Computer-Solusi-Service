'use client';

import React from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Clock, Laptop, Wrench, ShieldCheck } from 'lucide-react';

interface CustomerDetailModalProps {
  customer: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
}: CustomerDetailModalProps) {
  if (!isOpen || !customer) return null;

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
        background: 'rgba(5, 8, 22, 0.85)',
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
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: '#0d1222',
          border: '1px solid rgba(239, 68, 68, 0.3)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1.25rem',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              flexShrink: 0,
            }}
          >
            {customer.name ? customer.name.slice(0, 2).toUpperCase() : 'CU'}
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              {customer.name}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#f87171' }}>
              ID Customer: {customer.id} • Registered Customer
            </p>
          </div>
        </div>

        {/* Contact Info Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-subtle)', display: 'block' }}>Email:</span>
            <strong style={{ color: 'var(--text-main)' }}>{customer.email}</strong>
          </div>

          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-subtle)', display: 'block' }}>Telepon / WA:</span>
            <strong style={{ color: 'var(--text-main)' }}>{customer.phone || '-'}</strong>
          </div>

          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', fontSize: '0.82rem', gridColumn: 'span 2' }}>
            <span style={{ color: 'var(--text-subtle)', display: 'block' }}>Alamat Utama:</span>
            <strong style={{ color: 'var(--text-main)' }}>{customer.address || 'Belum diisi'}</strong>
          </div>
        </div>

        {/* Customer Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block' }}>Total Order</span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--primary-light)' }}>{customer.totalOrders || 0} Tiket</strong>
          </div>

          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block' }}>Servis Selesai</span>
            <strong style={{ fontSize: '1.2rem', color: '#34d399' }}>{customer.completedOrders || 0} Tiket</strong>
          </div>

          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block' }}>Total Transaksi</span>
            <strong style={{ fontSize: '1rem', color: 'var(--warning)' }}>{formatPrice(customer.totalSpent || 0)}</strong>
          </div>
        </div>

        {/* Service Order History List */}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
            Riwayat & Tiket Servis Customer ({customer.serviceOrders?.length || 0}):
          </h4>

          {!customer.serviceOrders || customer.serviceOrders.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Customer belum pernah membuat order servis.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customer.serviceOrders.map((ord: any) => (
                <div
                  key={ord.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <strong style={{ color: '#f87171', fontSize: '0.88rem' }}>#{ord.ticketNumber}</strong>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {ord.deviceBrand} {ord.deviceModel}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {ord.problemDescription}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                      {ord.status}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {formatPrice(ord.quotation?.total || ord.diagnosis?.estimatedCost || 0)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
