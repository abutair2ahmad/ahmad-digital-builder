import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localePath,
  negotiateLocale,
  stripLocale,
  type Locale,
} from '@/lib/i18n/config';

/**
 * Locale routing and route protection.
 *
 * English is served unprefixed so every link already in the wild keeps
 * working; Arabic lives under `/ar` and is rewritten onto the same routes
 * with the locale carried in a request header. Visitors who prefer Arabic are
 * redirected once, and their choice is remembered in a cookie that the
 * language switcher overwrites.
 */
const PROTECTED = ['/dashboard', '/onboarding'];
const LOCAL_SESSION_COOKIE = 'qf_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

function resolveLocale(request: NextRequest, fromPath: Locale | null): { locale: Locale; explicit: boolean } {
  if (fromPath) return { locale: fromPath, explicit: true };
  const header = request.headers.get(LOCALE_HEADER);
  if (isLocale(header)) return { locale: header, explicit: true };
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return { locale: cookie, explicit: true };
  return { locale: negotiateLocale(request.headers.get('accept-language')), explicit: false };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const stripped = stripLocale(pathname);
  const prefixed = stripped.path !== pathname;
  const { locale, explicit } = resolveLocale(request, prefixed ? stripped.locale : null);
  const path = stripped.path;
  const isApi = path.startsWith('/api');

  // A visitor whose preference is Arabic lands on the Arabic URL once, so the
  // address bar matches what they are reading and the page can be shared.
  if (!prefixed && !isApi && locale !== DEFAULT_LOCALE && request.method === 'GET') {
    const url = request.nextUrl.clone();
    url.pathname = localePath(path, locale);
    const redirect = NextResponse.redirect(url);
    if (explicit) redirect.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
    return redirect;
  }

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = path === '/login' || path === '/signup';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = path;

  const pass = () =>
    prefixed
      ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });

  if (!isProtected && !isAuthPage) {
    const response = pass();
    if (prefixed) response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseMode = Boolean(supabaseUrl && supabaseAnonKey && process.env.DATABASE_URL);

  let response = pass();
  let signedIn = false;

  if (supabaseMode) {
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          const refreshed = new Headers(request.headers);
          refreshed.set(LOCALE_HEADER, locale);
          response = prefixed
            ? NextResponse.rewrite(rewriteUrl, { request: { headers: refreshed } })
            : NextResponse.next({ request: { headers: refreshed } });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } else {
    signedIn = Boolean(request.cookies.get(LOCAL_SESSION_COOKIE)?.value);
  }

  if (isProtected && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = localePath('/login', locale);
    url.search = `?next=${encodeURIComponent(localePath(path, locale))}`;
    return NextResponse.redirect(url);
  }
  if (isAuthPage && signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = localePath('/dashboard', locale);
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (prefixed) response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
  return response;
}

export const config = {
  // Everything except Next's own assets and static files, so the locale header
  // is always present and `/ar/...` resolves for every route.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|woff2?)$).*)'],
};
