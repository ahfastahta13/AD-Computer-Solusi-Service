'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Receipt,
  CircleDollarSign,
  Bot,
  ArrowLeft,
  ShieldAlert,
  Server,
  User,
  LogOut,
  Loader2,
  Bell,
  BellRing,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleBadgeStyle } from '@/lib/auth';
interface AdminSidebarProps {
  onNavigate?: () => void;
}

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const badgeStyle = getRoleBadgeStyle('ADMIN');

  const navItems = [
    { label: 'Overview Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Profil Admin', href: '/admin/profile', icon: User },
    { label: 'Service Orders', href: '/admin/orders', icon: ClipboardList },
    { label: 'Data Customer', href: '/admin/customers', icon: Users },
    { label: 'Quotation Manager', href: '/admin/quotations', icon: Receipt },
    { label: 'Verifikasi Pembayaran', href: '/admin/payments', icon: CircleDollarSign },
    { label: 'Notifikasi', href: '/admin/notifications', icon: Bell },
    { label: 'Konfigurasi Notifikasi', href: '/admin/notification-settings', icon: BellRing },
    { label: 'Konfigurasi Sistem', href: '/admin/system-config', icon: Settings },
    { label: 'AI Knowledge Base', href: '/admin/knowledge-base', icon: Bot },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';

  return (
    <aside className="portal-sidebar" style={{ background: '#0a0d17', borderColor: 'rgba(239, 68, 68, 0.15)' }}>
      {/* Brand */}
      <div className="sidebar-header" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
        <Link href="/" className="brand-logo" style={{ fontSize: '1.05rem' }}>
          <div className="brand-icon" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.95rem' }}>IT Service</span>
            <span style={{ color: '#f87171', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>
              Admin Console
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        <div className="sidebar-label" style={{ color: '#94a3b8' }}>Manajemen Sistem</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`nav-link ${isActive ? 'active' : ''}`}
              style={{
                background: isActive ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)' : undefined,
                borderLeftColor: isActive ? '#ef4444' : undefined,
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="sidebar-label" style={{ marginTop: '16px', color: '#94a3b8' }}>
          System Tools
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            fontSize: '0.78rem',
            margin: '0 4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', marginBottom: '4px' }}>
            <Server size={14} />
            <strong>System Engine: Online</strong>
          </div>
          <div style={{ color: 'var(--text-subtle)' }}>Prisma / SQLite Active</div>
        </div>

        <Link href="/" onClick={onNavigate} className="nav-link" style={{ marginTop: '8px' }}>
          <ArrowLeft size={18} />
          <span>Kembali ke Web</span>
        </Link>
      </div>

      {/* Admin Profile Footer & Logout */}
      <div className="sidebar-footer" style={{ borderColor: 'rgba(239, 68, 68, 0.15)', flexDirection: 'column', gap: '12px' }}>
        <Link href="/admin/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textDecoration: 'none' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || 'Admin IT Central'}
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: 600,
                background: badgeStyle.bg,
                color: badgeStyle.color,
                border: `1px solid ${badgeStyle.border}`,
              }}
            >
              {badgeStyle.label}
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="btn btn-outline btn-sm"
          style={{
            width: '100%',
            justifyContent: 'center',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '8px',
            fontSize: '0.8rem',
          }}
        >
          {isLoggingOut ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Keluar...</span>
            </>
          ) : (
            <>
              <LogOut size={14} />
              <span>Keluar (Logout)</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
