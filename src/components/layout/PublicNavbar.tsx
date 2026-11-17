'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cpu, User, Shield, LogOut, Loader2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PublicNavbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navLinks = [
    { label: 'Beranda', href: '/' },
    { label: 'Layanan IT', href: '/services' },
    { label: 'Lacak Servis', href: '/track' },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  return (
    <nav className="public-navbar">
      <div className="public-nav-container">
        {/* Brand Logo */}
        <Link href="/" className="brand-logo">
          <div className="brand-icon">
            <Cpu size={20} />
          </div>
          <div>
            <span>IT Service</span>
            <span style={{ color: 'var(--primary-light)', fontSize: '0.85em', display: 'block', fontWeight: 400 }}>
              Business System
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    color: isActive ? 'var(--primary-light)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'var(--transition)',
                    fontSize: '0.95rem',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Dynamic Auth / Portal Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAuthenticated && user ? (
            <>
              <Link
                href={user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard'}
                className="btn btn-primary btn-sm"
                style={{
                  background: user.role === 'ADMIN' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : undefined,
                }}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard ({user.name.split(' ')[0]})</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn btn-outline btn-sm"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
              >
                {isLoggingOut ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={14} />
                )}
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-outline btn-sm">
                <User size={14} />
                Masuk
              </Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm">
                <Shield size={14} />
                Daftar Customer
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
