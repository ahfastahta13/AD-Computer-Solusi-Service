'use client';

import React, { useState } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AppHeader from '@/components/layout/AppHeader';
import Chatbot from '@/components/ui/Chatbot';

export default function AdminPortalLayout({
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
        <AdminSidebar onNavigate={() => setIsSidebarOpen(false)} />
      </div>
      <div className="portal-main">
        <AppHeader
          role="ADMIN"
          title="Admin Console"
          subtitle="Pusat Kendali Operasional Servis & Manajemen Bisnis IT"
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />
        <main className="portal-content">{children}</main>
        <Chatbot />
      </div>
    </div>
  );
}
