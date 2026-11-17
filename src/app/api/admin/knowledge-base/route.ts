import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { invalidateBusinessKnowledge } from '@/lib/ai-knowledge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const items = await prisma.knowledgeBase.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('[KNOWLEDGE_BASE_GET]', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil knowledge base' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { category, title, content } = body;

    if (!category || !title || !content) {
      return NextResponse.json({ success: false, message: 'Semua field wajib diisi' }, { status: 400 });
    }

    const item = await prisma.knowledgeBase.create({
      data: { category, title, content, isActive: true }
    });

    invalidateBusinessKnowledge();

    return NextResponse.json({ success: true, message: 'Knowledge ditambahkan', item });
  } catch (error) {
    console.error('[KNOWLEDGE_BASE_POST]', error);
    return NextResponse.json({ success: false, message: 'Gagal menambahkan knowledge' }, { status: 500 });
  }
}
