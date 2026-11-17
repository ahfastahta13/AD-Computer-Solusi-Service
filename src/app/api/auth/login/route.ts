import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword } from '@/lib/password';
import { signJWT, COOKIE_NAME } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, requestedRole } = body;

    // 1. Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Alamat email wajib diisi.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Password wajib diisi.' },
        { status: 400 }
      );
    }

    // 2. Find User in DB
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: 'Email atau password yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // 3. Compare Password Hash
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Email atau password yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // 4. Role Match Verification (if requestedRole was specified from tab)
    if (requestedRole && requestedRole === 'ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          message: 'Akun Anda tidak memiliki hak akses sebagai Administrator.',
        },
        { status: 403 }
      );
    }

    // 5. Generate JWT Token
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role as 'CUSTOMER' | 'ADMIN' | 'TECHNICIAN',
      name: user.name,
    });

    const targetDashboard = user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard';

    const response = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
      },
      redirectTo: targetDashboard,
    });

    // 6. Set HTTP-only Cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[AUTH_LOGIN_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat proses login.' },
      { status: 500 }
    );
  }
}
