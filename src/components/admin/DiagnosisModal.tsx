'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Save, AlertCircle, CheckCircle2, Loader2, DollarSign, Bot, Sparkles } from 'lucide-react';
import { ServiceOrder } from '@/types';

interface DiagnosisModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DiagnosisModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: DiagnosisModalProps) {
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateAI = async () => {
    if (!order) return;
    setIsGeneratingAI(true);
    setErrorMsg('');
    
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: order.problemDescription,
          deviceInformation: `${order.deviceType} ${order.deviceBrand} ${order.deviceModel}`,
          symptoms: order.problemDescription, // In MVP, symptoms is the problem description
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Just put the raw markdown in the diagnosis field for the admin to read/edit
        setDiagnosis(data.diagnosis);
      } else {
        setErrorMsg(data.message || 'Gagal generate AI diagnosis.');
      }
    } catch (err) {
      setErrorMsg('Kesalahan jaringan saat menghubungi AI Server.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  useEffect(() => {
    if (order && order.diagnosis) {
      setDiagnosis(order.diagnosis.diagnosis || '');
      setRecommendation(order.diagnosis.recommendation || '');
      setEstimatedCost(order.diagnosis.estimatedCost || '');
    } else {
      setDiagnosis('');
      setRecommendation('');
      setEstimatedCost('');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!diagnosis.trim()) {
      setErrorMsg('Hasil analisa diagnosa wajib diisi.');
      return;
    }

    if (!recommendation.trim()) {
      setErrorMsg('Rekomendasi perbaikan / suku cadang wajib diisi.');
      return;
    }

    if (estimatedCost === '' || Number(estimatedCost) < 0) {
      setErrorMsg('Estimasi biaya perbaikan harus berupa angka valid.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId: order.id,
          diagnosis,
          recommendation,
          estimatedCost: Number(estimatedCost),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1000);
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan hasil diagnosa.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
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
          maxWidth: '560px',
          padding: '28px',
          background: 'var(--bg-card)',
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
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <FileText size={20} style={{ color: '#f87171' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Input Diagnosa Teknis Lab
            </h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tiket: <strong style={{ color: '#f87171' }}>#{order.ticketNumber}</strong> ({order.deviceBrand} {order.deviceModel})
            </p>
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
              }}
            >
              {isGeneratingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Generate Draft AI
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Hasil Analisa Diagnosa & Akar Masalah Kerusakan</span>
              {isGeneratingAI && <span style={{ color: '#8b5cf6', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Loader2 size={12} className="animate-spin" /> AI berpikir...</span>}
            </label>
            <textarea
              className="form-control"
              rows={8}
              placeholder="Contoh: Bearing fan pendingin CPU macet dan thermal paste kering total."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rekomendasi Tindakan & Part Pengganti</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Contoh: Penggantian modul Dual Fan Cooling Original dan repasting PTM7950."
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estimasi Total Biaya Perbaikan (IDR)</label>
            <input
              type="number"
              className="form-control"
              placeholder="Contoh: 650000"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Simpan Diagnosa & Ubah Status WAITING_APPROVAL</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
