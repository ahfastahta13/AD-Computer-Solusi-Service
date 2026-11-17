'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, User, Sparkles, Layers } from 'lucide-react';

export default function RoleSwitcher() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isCustomer = pathname.startsWith('/customer');

  return (
    <div className="role-switcher-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={16} color="#818cf8" />
        <span style={{ color: '#c7d2fe', fontWeight: 500 }}>
          <strong>MVP Role Context:</strong>{' '}
          {isAdmin ? 'Mode Administrator' : isCustomer ? 'Mode Customer' : 'Public View'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link
          href="/customer/dashboard"
          className={`btn btn-sm ${isCustomer ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
        >
          <User size={13} />
          Customer Portal
        </Link>

        <Link
          href="/admin/dashboard"
          className={`btn btn-sm ${isAdmin ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            padding: '4px 10px',
            fontSize: '0.78rem',
            background: isAdmin ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : undefined,
          }}
        >
          <Shield size={13} />
          Admin Console
        </Link>

        <Link
          href="/"
          className="btn btn-sm btn-outline"
          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
        >
          Public Landing
        </Link>
      </div>
    </div>
  );
}
