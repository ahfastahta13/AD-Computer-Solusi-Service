'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ShieldCheck, UserCheck, Menu } from 'lucide-react';
import { UserRole } from '@/types';
import { getRoleBadgeStyle } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

interface AppHeaderProps {
  role: UserRole;
  title: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
}

export default function AppHeader({ role, title, subtitle, onToggleSidebar }: AppHeaderProps) {
  const { user } = useAuth();
  const badgeStyle = getRoleBadgeStyle(user?.role || role);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const apiPath =
      role === 'ADMIN' ? '/api/admin/notifications' : '/api/customer/notifications';

    const fetchUnread = async () => {
      try {
        const res = await fetch(apiPath);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          const notifications: any[] = data.notifications || [];
          const count = notifications.filter((n: any) => !n.isRead).length;
          setUnreadCount(count);
        }
      } catch {
        // silently fail — bell just shows no count
      }
    };

    fetchUnread();

    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [role]);

  const notifHref =
    role === 'ADMIN' ? '/admin/notifications' : '/customer/notifications';

  return (
    <header className="app-header">
      {/* Title & Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleSidebar && (
          <button 
            type="button" 
            onClick={onToggleSidebar}
            className="mobile-menu-btn"
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-main)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: '4px'
            }}
          >
            <Menu size={24} />
          </button>
        )}
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            {title}
          </h1>
          {subtitle && (
            <p className="header-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Header Right Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* User Greeting & Role Tag */}
        <Link
          href={role === 'ADMIN' ? '/admin/profile' : '/customer/profile'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {user?.name || 'User'}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: badgeStyle.bg,
              border: `1px solid ${badgeStyle.border}`,
              color: badgeStyle.color,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {role === 'ADMIN' ? <ShieldCheck size={13} /> : <UserCheck size={13} />}
            <span>{badgeStyle.label}</span>
          </div>
        </Link>

        {/* Notification Bell */}
        <Link
          href={notifHref}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: unreadCount > 0 ? (role === 'ADMIN' ? '#ef4444' : 'var(--primary-light)') : 'var(--text-muted)',
            cursor: 'pointer',
            position: 'relative',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
          title={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Notifikasi'}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                borderRadius: '10px',
                background: role === 'ADMIN' ? '#ef4444' : 'var(--primary-light)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-main)',
                lineHeight: 1,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
