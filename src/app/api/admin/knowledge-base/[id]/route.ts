import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { invalidateBusinessKnowledge } from '@/lib/ai-knowledge';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const item = await prisma.knowledgeBase.update({
      where: { id: params.id },
      data: body
    });

    invalidateBusinessKnowledge();

    return NextResponse.json({ success: true, message: 'Knowledge diperbarui', item });
  } catch (error) {
    console.error('[KNOWLEDGE_BASE_PATCH]', error);
    return NextResponse.json({ success: false, message: 'Gagal update knowledge' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    await prisma.knowledgeBase.delete({
      where: { id: params.id }
    });

    invalidateBusinessKnowledge();

    return NextResponse.json({ success: true, message: 'Knowledge dihapus' });
  } catch (error) {
    console.error('[KNOWLEDGE_BASE_DELETE]', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus knowledge' }, { status: 500 });
  }
}
