import type { Metadata } from 'next';
import './globals.css';
import RoleSwitcher from '@/components/ui/RoleSwitcher';
import { APP_CONFIG } from '@/lib/config';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} | Solusi & Service Komputer Profesional`,
  description: APP_CONFIG.tagline,
  keywords: ['IT service', 'service komputer', 'reparasi laptop', 'jasa IT bisnis', 'maintenance IT'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <RoleSwitcher />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
