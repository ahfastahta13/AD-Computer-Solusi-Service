import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Tidak terotorisasi. Silakan login kembali.' },
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, phone, address, currentPassword, newPassword } = body;

    const updateData: {
      name?: string;
      phone?: string | null;
      address?: string | null;
      password?: string;
    } = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      updateData.phone = typeof phone === 'string' ? phone.trim() : null;
    }

    if (address !== undefined) {
      updateData.address = typeof address === 'string' ? address.trim() : null;
    }

    // Password Update Logic
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: 'Password baru minimal 8 karakter.' },
          { status: 400 }
        );
      }

      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Password saat ini wajib diisi untuk mengubah password.' },
          { status: 400 }
        );
      }

      if (!user.password) {
        return NextResponse.json(
          { success: false, message: 'Pengguna belum memiliki password.' },
          { status: 400 }
        );
      }

      const isCurrentPasswordCorrect = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordCorrect) {
        return NextResponse.json(
          { success: false, message: 'Password saat ini tidak sesuai.' },
          { status: 400 }
        );
      }

      updateData.password = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('[AUTH_PROFILE_UPDATE_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat memperbarui profil.' },
      { status: 500 }
    );
  }
}
