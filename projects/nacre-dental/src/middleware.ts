import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth/constants';

/**
 * Gate for the clinic-facing surface.
 *
 * The middleware only checks that a session cookie is *present* — the signature
 * is verified inside each route and page with the secret, which is not
 * available to the edge runtime. Presence is enough to redirect anonymous
 * visitors to the login screen; authority still rests on the server.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(ADMIN_COOKIE)?.value);

  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/session')) {
    if (!hasCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard') && pathname !== '/dashboard/login' && !hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};
