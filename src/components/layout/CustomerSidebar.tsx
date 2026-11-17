'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Clock3,
  Bell,
  User,
  BotMessageSquare,
  Cpu,
  ArrowLeft,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleBadgeStyle } from '@/lib/auth';

interface CustomerSidebarProps {
  onNavigate?: () => void;
}

export default function CustomerSidebar({ onNavigate }: CustomerSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const badgeStyle = getRoleBadgeStyle(user?.role || 'CUSTOMER');

  const navItems = [
    { label: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
    { label: 'Services Catalog', href: '/customer/services', icon: Wrench },
    { label: 'My Service Orders', href: '/customer/orders', icon: Clock3 },
    { label: 'Notifications', href: '/customer/notifications', icon: Bell },
    { label: 'Profile', href: '/customer/profile', icon: User },
    { label: 'AI Assistant', href: '/customer/ai-assistant', icon: BotMessageSquare },
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
    : 'CU';

  return (
    <aside className="portal-sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <Link href="/" className="brand-logo" style={{ fontSize: '1.05rem' }}>
          <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
            <Cpu size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.95rem' }}>IT Service</span>
            <span style={{ color: 'var(--primary-light)', fontSize: '0.75rem', display: 'block' }}>
              Customer Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        <div className="sidebar-label">Menu Pelanggan</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="sidebar-label" style={{ marginTop: '16px' }}>
          Akses Cepat
        </div>
        <Link href="/track" onClick={onNavigate} className="nav-link">
          <Clock3 size={18} />
          <span>Tracking Publik</span>
        </Link>
        <Link href="/" onClick={onNavigate} className="nav-link">
          <ArrowLeft size={18} />
          <span>Kembali ke Web</span>
        </Link>
      </div>

      {/* User Profile Footer & Logout */}
      <div className="sidebar-footer" style={{ flexDirection: 'column', gap: '12px' }}>
        <Link href="/customer/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textDecoration: 'none' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
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
              {user?.name || 'Customer User'}
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
              <span>Logout</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
