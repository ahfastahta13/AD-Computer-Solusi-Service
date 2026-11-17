'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2, Info, CheckCircle2, FileText, Clock } from 'lucide-react';
import { Notification } from '@/types';

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/customer/notifications', {
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
      const res = await fetch('/api/customer/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'QUOTATION_READY':
        return <FileText size={18} style={{ color: 'var(--warning)' }} />;
      case 'PAYMENT_CONFIRMED':
        return <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />;
      case 'ORDER_STATUS':
        return <Clock size={18} style={{ color: 'var(--primary-light)' }} />;
      default:
        return <Info size={18} style={{ color: 'var(--info)' }} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-light)' }} />
        <span>Memuat notifikasi...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <div
        className="card-glass"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={22} style={{ color: 'var(--primary-light)' }} />
            Notifikasi Sistem
            {unreadCount > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'var(--primary-light)',
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
            Pemberitahuan real-time terkait status order servis, quotation, dan konfirmasi pembayaran.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCheck size={16} />
            <span>Tandai Semua Terbaca</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Bell size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Belum ada notifikasi saat ini.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="card"
              onClick={() => !notif.isRead && handleMarkRead(notif.id)}
              style={{
                padding: '18px 20px',
                background: notif.isRead ? 'var(--bg-card)' : 'rgba(14, 165, 233, 0.08)',
                border: notif.isRead ? '1px solid var(--border-glass)' : '1px solid rgba(56, 189, 248, 0.3)',
                cursor: notif.isRead ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getTypeIcon(notif.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                    {notif.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    {new Date(notif.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {notif.message}
                </p>
              </div>

              {!notif.isRead && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
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
