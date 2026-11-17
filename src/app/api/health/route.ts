import { NextResponse } from 'next/server';
import { APP_CONFIG } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: APP_CONFIG.name,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0-mvp',
    architecture: {
      framework: 'Next.js 14 (App Router)',
      runtime: 'Node.js',
      database: 'SQLite / PostgreSQL Ready (Prisma ORM)',
      styling: 'Vanilla CSS Design System',
      roles: ['CUSTOMER', 'ADMIN', 'TECHNICIAN'],
    },
  });
}
