import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, negotiateLocale } from '@/lib/i18n/config';

/**
 * Never runs on /ar, /he, /en pages, so the public tree stays fully static:
 * 1. `/` → 307 to the saved locale, else Accept-Language, else /ar.
 * 2. `/dashboard/*` → demo redirect without Supabase, or owner session
 *    refresh + login redirect with it (the pages re-check ownership).
 * 3. Any other first segment (`/xx`) is not a locale: serve the 404 page
 *    instead of letting it reach the [locale] root layout.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(saved) ? saved : negotiateLocale(request.headers.get('accept-language')) ?? DEFAULT_LOCALE;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url, 307);
  }

  if (pathname !== '/dashboard' && !pathname.startsWith('/dashboard/')) {
    return NextResponse.rewrite(new URL('/ar/_not-found', request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isDemo = pathname === '/dashboard/demo';

  if (!url || !anonKey) {
    if (isDemo) return NextResponse.next();
    const to = request.nextUrl.clone();
    to.pathname = '/dashboard/demo';
    to.search = '';
    return NextResponse.redirect(to, 307);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  const isLogin = pathname === '/dashboard/login';
  if (!data.user && !isLogin && !isDemo) {
    const to = request.nextUrl.clone();
    to.pathname = '/dashboard/login';
    to.search = '';
    return NextResponse.redirect(to, 307);
  }
  if (data.user && (isLogin || pathname === '/dashboard')) {
    const to = request.nextUrl.clone();
    to.pathname = '/dashboard/orders';
    to.search = '';
    return NextResponse.redirect(to, 307);
  }
  return response;
}

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/dashboard/:path*',
    // First segment that is not a locale, dashboard or Next internals, and not
    // a file at any depth (public/menu/*.webp, /hero.webp, /robots.txt…).
    '/((?!ar(?:/|$)|he(?:/|$)|en(?:/|$)|dashboard(?:/|$)|_next/|.*\\.[a-zA-Z0-9]+$).+)',
  ],
};
