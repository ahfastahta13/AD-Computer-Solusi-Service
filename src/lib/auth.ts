import { UserRole, UserSession } from '@/types';

export const DEMO_USERS: Record<UserRole, UserSession> = {
  CUSTOMER: {
    id: 'usr-customer-01',
    name: 'Budi Pratama',
    email: 'budi.customer@example.com',
    role: 'CUSTOMER',
    phone: '+62 812-9876-5432',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  ADMIN: {
    id: 'usr-admin-01',
    name: 'Admin IT Central',
    email: 'admin@itservice-system.com',
    role: 'ADMIN',
    phone: '+62 811-2345-6789',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  TECHNICIAN: {
    id: 'usr-tech-01',
    name: 'Rian Hardware Specialist',
    email: 'rian.tech@itservice-system.com',
    role: 'TECHNICIAN',
    phone: '+62 813-1122-3344',
  },
};

export function hasPermission(role: UserRole, requiredRole: UserRole): boolean {
  if (role === 'ADMIN') return true;
  return role === requiredRole;
}

export function getRoleBadgeStyle(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.3)',
        label: 'Administrator',
      };
    case 'TECHNICIAN':
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.3)',
        label: 'Teknisi IT',
      };
    case 'CUSTOMER':
    default:
      return {
        bg: 'rgba(14, 165, 233, 0.15)',
        color: '#38bdf8',
        border: 'rgba(14, 165, 233, 0.3)',
        label: 'Customer',
      };
  }
}
