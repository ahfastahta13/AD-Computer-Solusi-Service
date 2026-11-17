'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Send, AlertCircle, CheckCircle2, Loader2, Receipt } from 'lucide-react';
import { ServiceOrder } from '@/types';

interface QuotationBuilderModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function QuotationBuilderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: QuotationBuilderModalProps) {
  const [items, setItems] = useState<ItemRow[]>([
    { description: 'Replacement Sparepart Original', quantity: 1, unitPrice: 350000 },
    { description: 'Jasa Pemasangan & Deep Motherboard Cleaning', quantity: 1, unitPrice: 150000 },
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Garansi suku cadang original selama 90 hari. Penawaran berlaku selama 14 hari.');
  const [status, setStatus] = useState<'SENT' | 'DRAFT'>('SENT');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (order && order.quotation) {
      if (order.quotation.items && order.quotation.items.length > 0) {
        setItems(
          order.quotation.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))
        );
      }
      setDiscount(order.quotation.discount || 0);
      setNotes(order.quotation.notes || '');
      setStatus((order.quotation.status as any) || 'SENT');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Math.max(0, parseFloat(value) || 0);
    } else {
      updated[index].description = String(value);
    }
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const finalTotal = Math.max(0, subtotal - (Number(discount) || 0));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (items.some((i) => !i.description.trim())) {
      setErrorMsg('Semua deskripsi item wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId: order.id,
          items,
          discount: Number(discount) || 0,
          notes,
          status,
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
        setErrorMsg(data.message || 'Gagal menerbitkan quotation.');
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
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            <Receipt size={20} style={{ color: '#f87171' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Pembuat Surat Penawaran Biaya (Quotation Builder)
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Tiket: <strong style={{ color: '#f87171' }}>#{order.ticketNumber}</strong> • Customer: {order.customer?.name || 'Customer'}
          </p>
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
          {/* Dynamic Item Rows */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
                Rincian Suku Cadang & Biaya Jasa:
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} />
                <span>Tambah Baris</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 130px 120px 36px',
                    gap: '8px',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Deskripsi item / sparepart"
                    value={row.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                    style={{ fontSize: '0.85rem' }}
                  />

                  <input
                    type="number"
                    className="form-control"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    min={1}
                    required
                    style={{ fontSize: '0.85rem', textAlign: 'center' }}
                  />

                  <input
                    type="number"
                    className="form-control"
                    placeholder="Harga Satuan"
                    value={row.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    min={0}
                    required
                    style={{ fontSize: '0.85rem', textAlign: 'right' }}
                  />

                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'right' }}>
                    {formatPrice(row.quantity * row.unitPrice)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: items.length <= 1 ? 'var(--text-subtle)' : '#f87171',
                      cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations Summary Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Diskon / Potongan Harga (IDR)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>

            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-glass)', textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Subtotal: {formatPrice(subtotal)}</div>
              <div style={{ fontSize: '0.78rem', color: '#f87171' }}>Diskon: - {formatPrice(discount)}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: '4px' }}>
                TOTAL: {formatPrice(finalTotal)}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan & Garansi Syarat Ketentuan</label>
            <textarea
              className="form-control"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                padding: '10px 20px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menerbitkan...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Terbitkan & Kirim Quotation ke Customer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
