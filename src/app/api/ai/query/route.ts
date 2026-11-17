import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Allowed tables for AI query (read-only)
const ALLOWED_TABLES = [
  'users',
  'services',
  'service_orders',
  'diagnoses',
  'quotations',
  'quotation_items',
  'payments',
  'notifications',
  'knowledge_base',
];

// Sensitive fields that should never be exposed
const SENSITIVE_FIELDS = ['password', 'proof_attachment'];

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak terotorisasi.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Sesi login telah kadaluarsa.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { table, action, filters, limit } = body;

    // Validate table name
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json(
        { success: false, message: `Tabel tidak valid. Tabel yang diizinkan: ${ALLOWED_TABLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Only allow read operations
    if (action !== 'findMany' && action !== 'findFirst' && action !== 'count' && action !== 'aggregate') {
      return NextResponse.json(
        { success: false, message: 'Hanya operasi read (findMany, findFirst, count, aggregate) yang diizinkan.' },
        { status: 403 }
      );
    }

    // Build query options
    const queryOptions: any = {};

    if (filters && typeof filters === 'object') {
      queryOptions.where = filters;
    }

    if (limit && typeof limit === 'number' && limit > 0 && limit <= 100) {
      queryOptions.take = limit;
    } else {
      queryOptions.take = 20; // Default limit
    }

    // Execute query based on table
    let result;
    switch (table) {
      case 'users':
        queryOptions.select = {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        };
        result = await prisma.user.findMany(queryOptions);
        break;

      case 'services':
        result = await prisma.service.findMany(queryOptions);
        break;

      case 'service_orders':
        result = await prisma.serviceOrder.findMany({
          ...queryOptions,
          include: {
            customer: {
              select: { id: true, name: true, email: true, phone: true },
            },
            service: true,
            diagnosis: true,
            quotation: { include: { items: true } },
            payments: true,
          },
        });
        break;

      case 'diagnoses':
        result = await prisma.diagnosis.findMany(queryOptions);
        break;

      case 'quotations':
        result = await prisma.quotation.findMany({
          ...queryOptions,
          include: { items: true },
        });
        break;

      case 'quotation_items':
        result = await prisma.quotationItem.findMany(queryOptions);
        break;

      case 'payments':
        queryOptions.select = {
          id: true,
          serviceOrderId: true,
          amount: true,
          paymentMethod: true,
          paymentStatus: true,
          paymentDate: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        };
        result = await prisma.payment.findMany(queryOptions);
        break;

      case 'notifications':
        result = await prisma.notification.findMany(queryOptions);
        break;

      case 'knowledge_base':
        result = await prisma.knowledgeBase.findMany(queryOptions);
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Tabel tidak dikenali.' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      table,
      count: Array.isArray(result) ? result.length : 1,
      data: result,
    });
  } catch (error) {
    console.error('[AI_QUERY_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat query database.' },
      { status: 500 }
    );
  }
}
