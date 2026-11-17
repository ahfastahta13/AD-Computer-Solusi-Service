'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Loader2,
  Info,
  CheckCircle2,
  FileText,
  Clock,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'QUOTATION_READY':
        return <FileText size={18} style={{ color: '#f59e0b' }} />;
      case 'PAYMENT_CONFIRMED':
        return <CheckCircle2 size={18} style={{ color: '#10b981' }} />;
      case 'ORDER_STATUS':
        return <Clock size={18} style={{ color: '#38bdf8' }} />;
      case 'BOOKING':
        return <ShoppingBag size={18} style={{ color: '#8b5cf6' }} />;
      default:
        return <Info size={18} style={{ color: '#94a3b8' }} />;
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case 'QUOTATION_READY': return 'rgba(245, 158, 11, 0.12)';
      case 'PAYMENT_CONFIRMED': return 'rgba(16, 185, 129, 0.12)';
      case 'ORDER_STATUS': return 'rgba(56, 189, 248, 0.12)';
      default: return 'var(--bg-surface)';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#ef4444' }} />
        <span>Memuat notifikasi admin...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div
        className="card-glass"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid #ef4444',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Bell size={22} style={{ color: '#ef4444' }} />
            Notifikasi Admin
            {unreadCount > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {unreadCount} Baru
              </span>
            )}
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Pemberitahuan aktivitas penting: booking masuk, persetujuan quotation, dan status servis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchNotifications} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
            >
              <CheckCheck size={16} />
              <span>Tandai Semua Terbaca</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Bell size={40} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Belum ada notifikasi untuk admin.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
            Notifikasi muncul saat ada booking baru, customer approve/reject quotation, dan event lainnya.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="card"
              onClick={() => !notif.isRead && handleMarkRead(notif.id)}
              style={{
                padding: '16px 20px',
                background: notif.isRead
                  ? 'var(--bg-card)'
                  : 'rgba(239, 68, 68, 0.06)',
                border: notif.isRead
                  ? '1px solid var(--border-glass)'
                  : '1px solid rgba(239, 68, 68, 0.25)',
                cursor: notif.isRead ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: getTypeBgColor(notif.type),
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getTypeIcon(notif.type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px',
                    gap: '12px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '0.93rem',
                      fontWeight: notif.isRead ? 500 : 700,
                      margin: 0,
                      color: notif.isRead ? 'var(--text-muted)' : 'var(--text-main)',
                    }}
                  >
                    {notif.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', flexShrink: 0 }}>
                    {new Date(notif.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {notif.message}
                </p>
              </div>

              {/* Unread Dot */}
              {!notif.isRead && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    flexShrink: 0,
                    marginTop: '6px',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
