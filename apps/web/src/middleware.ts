import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  const host = request.headers.get('host') || hostname || '';

  // ── Detect environment ──────────────────────────────────────
  // Subdomain-based detection (production)
  const isSellerSubdomain    = host.startsWith('seller.');
  const isAdminSubdomain     = host.startsWith('admin.') || host.startsWith('masteradmin.');
  const isSuperAdminSubdomain = host.startsWith('superadmin.');
  const isPublicDomain       = !isSellerSubdomain && !isAdminSubdomain && !isSuperAdminSubdomain;

  // PM2 env-var-based detection (also works in production when subdomains
  // are proxied to individual ports)
  const appRole = process.env.NEXT_PUBLIC_APP_ROLE || '';
  const isSellerRole     = appRole === 'seller';
  const isAdminRole      = appRole === 'admin';
  const isSuperAdminRole = appRole === 'superadmin';

  // Combined: true if either method says it's that panel
  const isSeller     = isSellerSubdomain     || isSellerRole;
  const isAdmin      = isAdminSubdomain      || isAdminRole;
  const isSuperAdmin = isSuperAdminSubdomain || isSuperAdminRole;
  const isPanel      = isSeller || isAdmin || isSuperAdmin;

  // ── Public domain / no role: protect dashboard routes ────────
  // Allow public website to load, but block direct /dashboard access
  // unless the user navigated here via a known panel port in dev
  if (!isPanel) {
    // Redirect /dashboard to the seller panel URL in production
    if (pathname.startsWith('/dashboard')) {
      const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || '/login';
      if (sellerUrl.startsWith('http')) {
        return NextResponse.redirect(sellerUrl + pathname);
      }
    }
    return NextResponse.next();
  }

  // ── Seller panel ──────────────────────────────────────────────
  if (isSeller) {
    // Block access to admin routes
    if (pathname.startsWith('/dashboard/admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Redirect bare /dashboard → /dashboard (seller home)
    return NextResponse.next();
  }

  // ── Master Admin panel ────────────────────────────────────────
  if (isAdmin && !isSuperAdmin) {
    // Redirect base /dashboard → /dashboard/admin
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
    // Block register page on admin panel
    if (pathname.startsWith('/register')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // ── Super Admin panel ─────────────────────────────────────────
  if (isSuperAdmin) {
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard/superadmin', request.url));
    }
    if (pathname.startsWith('/register')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/register/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
