'use client';

import React, { useState } from 'react';
import CustomerSidebar from '@/components/layout/CustomerSidebar';
import AppHeader from '@/components/layout/AppHeader';
import Chatbot from '@/components/ui/Chatbot';

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="portal-layout">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, backdropFilter: 'blur(2px)' }}
        />
      )}
      <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}>
        <CustomerSidebar onNavigate={() => setIsSidebarOpen(false)} />
      </div>
      <div className="portal-main">
        <AppHeader
          role="CUSTOMER"
          title="Customer Portal"
          subtitle="Kelola servis komputer, penawaran harga, dan konsultasi IT"
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />
        <main className="portal-content">{children}</main>
        <Chatbot />
      </div>
    </div>
  );
}
