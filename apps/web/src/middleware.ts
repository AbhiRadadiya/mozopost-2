import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const allowedRole = process.env.NEXT_PUBLIC_APP_ROLE;
  const { pathname } = request.nextUrl;

  if (allowedRole) {
    const isSellerPortal = allowedRole === 'seller';
    const isAdminPortal = allowedRole === 'admin' || allowedRole === 'superadmin';

    // 1. If it's a seller portal, block access to /dashboard/admin
    if (isSellerPortal && pathname.startsWith('/dashboard/admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. If it's an admin portal, redirect the base /dashboard to /dashboard/admin
    if (isAdminPortal && pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
    
    // 3. Restrict registration on admin portals (only sellers should self-register)
    if (isAdminPortal && pathname.startsWith('/register')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/register/:path*'],
};
