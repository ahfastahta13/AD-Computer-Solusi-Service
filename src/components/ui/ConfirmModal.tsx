import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  type = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getStyle = () => {
    switch (type) {
      case 'danger':
        return { iconColor: '#ef4444', bgGlow: 'rgba(239, 68, 68, 0.1)', btnBg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' };
      case 'warning':
        return { iconColor: '#f59e0b', bgGlow: 'rgba(245, 158, 11, 0.1)', btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' };
      default:
        return { iconColor: '#0ea5e9', bgGlow: 'rgba(14, 165, 233, 0.1)', btnBg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' };
    }
  };

  const style = getStyle();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(5, 8, 22, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '30px', textAlign: 'center', border: `1px solid ${style.iconColor}` }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: style.bgGlow, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px auto', color: style.iconColor
        }}>
          <AlertTriangle size={32} />
        </div>
        
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-main)' }}>
          {title}
        </h3>
        
        <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn"
            style={{ flex: 1, background: style.btnBg, color: '#fff', border: 'none' }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
