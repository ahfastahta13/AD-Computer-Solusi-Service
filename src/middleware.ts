import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT, COOKIE_NAME } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let session = token ? await verifyJWT(token) : null;

  // 1. Protected Admin Routes (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based Access Control: Only ADMIN allowed
    if (session.role !== 'ADMIN') {
      // Customer trying to access Admin page -> Redirect to Customer Dashboard
      const customerUrl = new URL('/customer/dashboard', request.url);
      customerUrl.searchParams.set('unauthorized', 'true');
      return NextResponse.redirect(customerUrl);
    }
  }

  // 2. Protected Customer Routes (/customer/*)
  if (pathname.startsWith('/customer')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // CUSTOMER and ADMIN can both view customer portal (Admin can view customer side if needed)
  }

  // 3. Guest Only Routes (/auth/login, /auth/register)
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    if (session) {
      const redirectTarget = session.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard';
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/customer/:path*', '/auth/login', '/auth/register'],
};
