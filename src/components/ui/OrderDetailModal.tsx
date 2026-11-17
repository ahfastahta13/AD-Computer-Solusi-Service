'use client';

import React from 'react';
import {
  X,
  Laptop,
  Calendar,
  MapPin,
  Wrench,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { ServiceOrder } from '@/types';

interface OrderDetailModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  // Workflow status steps
  const workflowSteps = [
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'DIAGNOSING', label: 'Diagnosing' },
    { key: 'WAITING_APPROVAL', label: 'Waiting Approval' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'DELIVERED', label: 'Delivered' },
  ];

  // Helper map for legacy status mapping to workflow index
  const getStepIndex = (status: string): number => {
    switch (status) {
      case 'SUBMITTED':
      case 'PENDING':
        return 0;
      case 'DIAGNOSING':
        return 1;
      case 'WAITING_APPROVAL':
      case 'QUOTED':
        return 2;
      case 'IN_PROGRESS':
      case 'IN_REPAIR':
        return 3;
      case 'COMPLETED':
      case 'READY_FOR_PICKUP':
        return 4;
      case 'DELIVERED':
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStepIndex(order.status);

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
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--primary-light)',
                letterSpacing: '0.5px',
              }}
            >
              #{order.ticketNumber}
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: 'var(--primary-light)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {order.status}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Dibuat pada: {new Date(order.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Workflow Progress Timeline Stepper */}
        <div style={{ marginBottom: '28px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-subtle)', marginBottom: '14px', margin: 0 }}>
            Progress Status Penanganan (Workflow Timeline):
          </h4>

          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', overflowX: 'auto', paddingBottom: '6px' }}>
            {workflowSteps.map((step, idx) => {
              const isPassed = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    flex: 1,
                    minWidth: '85px',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isCurrent
                        ? 'var(--primary-light)'
                        : isPassed
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'var(--bg-card)',
                      border: isCurrent
                        ? '2px solid #fff'
                        : isPassed
                        ? '1px solid var(--success)'
                        : '1px solid var(--border-glass)',
                      color: isCurrent ? '#fff' : isPassed ? 'var(--success)' : 'var(--text-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      boxShadow: isCurrent ? '0 0 10px rgba(56, 189, 248, 0.5)' : 'none',
                    }}
                  >
                    {isPassed ? <CheckCircle2 size={14} /> : idx + 1}
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: isCurrent ? 700 : isPassed ? 600 : 400,
                      color: isCurrent ? 'var(--primary-light)' : isPassed ? 'var(--text-main)' : 'var(--text-subtle)',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device & Service Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Device Details */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--primary-light)' }}>
              <Laptop size={18} />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Informasi Perangkat</strong>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
              <div><strong>Kategori:</strong> {order.deviceType}</div>
              <div><strong>Merk / Brand:</strong> {order.deviceBrand}</div>
              <div><strong>Model / Seri:</strong> {order.deviceModel}</div>
            </div>
          </div>

          {/* Service & Type Details */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--warning)' }}>
              <Wrench size={18} />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Layanan & Penanganan</strong>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
              <div><strong>Layanan:</strong> {order.service?.name || 'General Repair / Custom Service'}</div>
              <div><strong>Metode:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-main)' }}>{order.serviceType} Service</span></div>
              {order.serviceType === 'onsite' && (
                <div><strong>Alamat Onsite:</strong> {order.address || '-'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule & Symptoms Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {/* Preferred Schedule */}
          <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} style={{ color: 'var(--info)', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block' }}>Jadwal Kunjungan / Penyerahan:</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {order.preferredSchedule
                  ? new Date(order.preferredSchedule).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Belum dijadwalkan'}
              </strong>
            </div>
          </div>

          {/* Problem Symptoms Description */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
            <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '6px', color: 'var(--text-main)' }}>
              Deskripsi Keluhan / Gejala Kerusakan:
            </strong>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              {order.problemDescription}
            </p>
          </div>
        </div>

        {/* Diagnosis & Quotation Summaries if available */}
        {order.diagnosis && (
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', marginBottom: '16px' }}>
            <strong style={{ fontSize: '0.9rem', color: 'var(--primary-light)', display: 'block', marginBottom: '6px' }}>
              🔬 Hasil Diagnosa Teknisi:
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 6px 0' }}>
              {order.diagnosis.diagnosis}
            </p>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
              <strong>Rekomendasi:</strong> {order.diagnosis.recommendation} (Estimasi Biaya: {formatPrice(order.diagnosis.estimatedCost)})
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-primary" style={{ padding: '8px 24px' }}>
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );
}
