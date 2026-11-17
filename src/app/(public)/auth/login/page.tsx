'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Cpu, Shield, User, Lock, Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'CORPORATE' | 'ADMIN'>('CUSTOMER');
  const [email, setEmail] = useState('budi.customer@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRoleSelect = (role: 'CUSTOMER' | 'CORPORATE' | 'ADMIN') => {
    setSelectedRole(role);
    setErrorMessage('');
    if (role === 'ADMIN') {
      setEmail('admin@itservice-system.com');
      setPassword('password123');
    } else if (role === 'CORPORATE') {
      setEmail('it.dept@majusolusindo.co.id');
      setPassword('password123');
    } else {
      setEmail('budi.customer@example.com');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Silakan isi email dan password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userRole = selectedRole === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
      const result = await login(email, password, userRole);
      if (result.success) {
        setSuccessMessage(result.message || 'Login berhasil! Mengalihkan...');
        setTimeout(() => {
          if (redirectParam) {
            router.push(redirectParam);
          } else {
            router.push(result.redirectTo || (selectedRole === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard'));
          }
        }, 600);
      } else {
        setErrorMessage(result.message || 'Gagal masuk. Periksa kembali email dan password.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ padding: '32px', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-card)' }}>
      {/* Logo & Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: selectedRole === 'ADMIN' 
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
              : selectedRole === 'CORPORATE'
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 14px auto',
            boxShadow: selectedRole === 'ADMIN' 
              ? '0 8px 20px rgba(239, 68, 68, 0.3)' 
              : selectedRole === 'CORPORATE'
                ? '0 8px 20px rgba(245, 158, 11, 0.3)'
                : '0 8px 20px rgba(14, 165, 233, 0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          {selectedRole === 'ADMIN' ? <Shield size={26} /> : selectedRole === 'CORPORATE' ? <Building2 size={26} /> : <Cpu size={26} />}
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
          Masuk ke {selectedRole === 'ADMIN' ? 'Admin Console' : selectedRole === 'CORPORATE' ? 'Corporate Portal' : 'Customer Portal'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Pilih mode akun untuk mengakses fitur yang sesuai
        </p>
      </div>

      {/* Role Selector Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <label className="form-label" style={{ marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
          Mode Akun Login:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={() => handleRoleSelect('CUSTOMER')}
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--radius-md)',
              border: selectedRole === 'CUSTOMER' ? '2px solid var(--primary-light)' : '1px solid var(--border-glass)',
              background: selectedRole === 'CUSTOMER' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface)',
              color: selectedRole === 'CUSTOMER' ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={14} />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('CORPORATE')}
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--radius-md)',
              border: selectedRole === 'CORPORATE' ? '2px solid #f59e0b' : '1px solid var(--border-glass)',
              background: selectedRole === 'CORPORATE' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
              color: selectedRole === 'CORPORATE' ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Building2 size={14} />
            <span>Corporate</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('ADMIN')}
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--radius-md)',
              border: selectedRole === 'ADMIN' ? '2px solid #ef4444' : '1px solid var(--border-glass)',
              background: selectedRole === 'ADMIN' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface)',
              color: selectedRole === 'ADMIN' ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Shield size={14} />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Alert Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Alert Success Message */}
      {successMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Loader2 size={18} className="animate-spin" style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              className="form-control"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              style={{ paddingLeft: '38px' }}
            />
            <Mail
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Password</label>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Masukkan password Anda"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
              style={{ paddingLeft: '38px', paddingRight: '38px' }}
            />
            <Lock
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-subtle)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Quick Helper Note for Demo Accounts */}
        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px dashed var(--border-glass)' }}>
          🔑 <strong>Default Password:</strong> <code>password123</code>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            background: selectedRole === 'ADMIN' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Memproses Login...</span>
            </>
          ) : (
            <>
              <span>Masuk Sebagai {selectedRole === 'ADMIN' ? 'Admin' : 'Customer'}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Register Link (Customer Only) */}
      {selectedRole === 'CUSTOMER' && (
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Belum punya akun?{' '}
          <Link href="/auth/register" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
            Daftar Akun Baru
          </Link>
        </div>
      )}

      {selectedRole === 'ADMIN' && (
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
          Pendaftaran akun Admin dikelola secara internal oleh Super Admin.
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ padding: '60px 0 100px 0', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: '460px' }}>
        <Suspense
          fallback={
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary-light)' }} />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Memuat halaman login...</p>
            </div>
          }
        >
          <LoginFormContent />
        </Suspense>
      </div>
    </div>
  );
}
