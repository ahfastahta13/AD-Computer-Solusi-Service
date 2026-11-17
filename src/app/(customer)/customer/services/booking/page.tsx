'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Wrench,
  Laptop,
  Calendar,
  MapPin,
  FileText,
  Upload,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { Service } from '@/types';

function BookingFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get('selected');

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Form State
  const [serviceId, setServiceId] = useState<string>(preselectedServiceId || '');
  const [deviceType, setDeviceType] = useState<string>('Laptop');
  const [deviceBrand, setDeviceBrand] = useState<string>('');
  const [deviceModel, setDeviceModel] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [attachment, setAttachment] = useState<string>('');
  const [serviceType, setServiceType] = useState<'workshop' | 'onsite'>('workshop');
  const [address, setAddress] = useState<string>('');
  const [preferredSchedule, setPreferredSchedule] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Fetch available service catalog from API
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingServices(true);
        const res = await fetch('/api/services');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setServices(data.services || []);
          }
        }
      } catch (err) {
        console.error('Failed to load services catalog', err);
      } finally {
        setLoadingServices(false);
      }
    }
    loadCatalog();
  }, []);

  useEffect(() => {
    if (preselectedServiceId) {
      setServiceId(preselectedServiceId);
    }
  }, [preselectedServiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!deviceBrand.trim()) {
      setErrorMessage('Silakan isi merk / brand perangkat.');
      return;
    }

    if (!deviceModel.trim()) {
      setErrorMessage('Silakan isi tipe / seri model perangkat.');
      return;
    }

    if (problemDescription.trim().length < 10) {
      setErrorMessage('Deskripsi keluhan minimal 10 karakter.');
      return;
    }

    if (serviceType === 'onsite' && !address.trim()) {
      setErrorMessage('Alamat lokasi wajib diisi untuk layanan Onsite.');
      return;
    }

    if (!preferredSchedule) {
      setErrorMessage('Silakan tentukan tanggal dan waktu jadwal penyerahan / kunjungan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: serviceId || null,
          deviceType,
          deviceBrand,
          deviceModel,
          problemDescription,
          attachment,
          serviceType,
          address: serviceType === 'onsite' ? address : undefined,
          preferredSchedule,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedOrder(data.order);
      } else {
        setErrorMessage(data.message || 'Gagal mengirimkan booking servis.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan sistem. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedOrder) {
    return (
      <div className="container" style={{ maxWidth: '640px', margin: '20px auto' }}>
        <div
          className="card"
          style={{
            padding: '36px 32px',
            textAlign: 'center',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              margin: '0 auto 18px auto',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
            Booking Servis Berhasil Dikirim! 🎉
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Tiket pengajuan servis komputer Anda telah dibuat di sistem dengan status awal <strong>SUBMITTED</strong>.
          </p>

          {/* Ticket Summary Box */}
          <div
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              textAlign: 'left',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>No. Tiket Pelacakan:</span>
              <strong style={{ color: 'var(--primary-light)', fontSize: '1.05rem' }}>{submittedOrder.ticketNumber}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', marginBottom: '10px' }}>
              <div><strong>Perangkat:</strong> {submittedOrder.deviceBrand} {submittedOrder.deviceModel}</div>
              <div><strong>Tipe:</strong> {submittedOrder.deviceType}</div>
              <div><strong>Penanganan:</strong> <span style={{ textTransform: 'capitalize' }}>{submittedOrder.serviceType} Service</span></div>
              <div><strong>Status:</strong> <span className="badge badge-pending">SUBMITTED</span></div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>Jadwal Preferred:</strong> {new Date(submittedOrder.preferredSchedule).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/customer/orders" className="btn btn-primary" style={{ padding: '10px 24px' }}>
              <span>Lihat Status di "My Service Orders"</span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/customer/dashboard" className="btn btn-outline" style={{ padding: '10px 20px' }}>
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div>
        <Link href="/customer/services" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none', marginBottom: '12px' }}>
          <ChevronLeft size={16} />
          <span>Kembali ke Katalog Layanan</span>
        </Link>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
          Formulir Booking Servis Komputer 🛠️
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Isi detail perangkat dan keluhan kerusakan untuk menjadwalkan penanganan dari teknisi profesional.
        </p>
      </div>

      {/* Alert Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Booking Form Card */}
      <form onSubmit={handleSubmit} className="card" style={{ padding: '28px', border: '1px solid var(--border-glass)' }}>
        {/* 1. Service Selection */}
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>1. Pilih Layanan (Optional / Sesuai Katalog):</label>
          {loadingServices ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Memuat opsi katalog...</div>
          ) : (
            <select
              className="form-control"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">-- General Repair / Diagnosa Umum (Opsional) --</option>
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} ({srv.category}) - Mulai Rp {srv.priceFrom.toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Device Details */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Laptop size={18} />
            2. Informasi Perangkat Komputer / IT
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Jenis Perangkat</label>
              <select
                className="form-control"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                required
              >
                <option value="Laptop">Laptop / Notebook</option>
                <option value="PC Desktop">PC Desktop / Workstation</option>
                <option value="Server/Network">Server / Router Network</option>
                <option value="Printer/Peripheral">Printer / CCTV / Peripheral</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Merk / Brand</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Asus, Lenovo, Apple, HP"
                value={deviceBrand}
                onChange={(e) => setDeviceBrand(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipe / Seri Model</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: ROG Strix G15 / ThinkPad T14"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* 3. Problem Symptoms & Photo Attachment */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} />
            3. Deskripsi Keluhan & Lampiran Foto
          </h3>

          <div className="form-group">
            <label className="form-label">Jelaskan Gejala Kerusakan / Keluhan (Minimal 10 Karakter):</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Contoh: Laptop mati mendadak saat dipakai render 3D, kipas berbunyi bising ekstrem dan bodi bagian bawah terasa sangat panas."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">URL Foto / Dokumen Fisik Perangkat (Opsional):</label>
            <input
              type="text"
              className="form-control"
              placeholder="https://images.unsplash.com/... (atau link foto Google Drive)"
              value={attachment}
              onChange={(e) => setAttachment(e.target.value)}
            />
          </div>
        </div>

        {/* 4. Service Type & Location */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} />
            4. Tipe Penanganan & Lokasi
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setServiceType('workshop')}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: serviceType === 'workshop' ? '2px solid var(--primary-light)' : '1px solid var(--border-glass)',
                background: serviceType === 'workshop' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface)',
                color: serviceType === 'workshop' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} />
                <span>Workshop Counter</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Saya akan membawa unit langsung ke lab servis</span>
            </button>

            <button
              type="button"
              onClick={() => setServiceType('onsite')}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: serviceType === 'onsite' ? '2px solid var(--warning)' : '1px solid var(--border-glass)',
                background: serviceType === 'onsite' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                color: serviceType === 'onsite' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} />
                <span>Onsite Visit (Kunjungan)</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Teknisi berkunjung ke rumah / lokasi kantor Anda</span>
            </button>
          </div>

          {serviceType === 'onsite' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Alamat Lengkap Lokasi Kunjungan Onsite:</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Gedung Cyber 2 Lt. 8, Jl. HR Rasuna Said, Kuningan, Jakarta Selatan"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {/* 5. Schedule & Submit */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} />
            5. Preferred Schedule (Jadwal Kunjungan / Penyerahan)
          </h3>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Pilih Tanggal & Waktu Diinginkan:</label>
            <input
              type="datetime-local"
              className="form-control"
              value={preferredSchedule}
              onChange={(e) => setPreferredSchedule(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Mengirimkan Booking Servis...</span>
              </>
            ) : (
              <>
                <span>Kirim Booking & Buat Tiket Servis</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CustomerBookingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-light)', margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Memuat formulir booking servis...</p>
        </div>
      }
    >
      <BookingFormContent />
    </Suspense>
  );
}
