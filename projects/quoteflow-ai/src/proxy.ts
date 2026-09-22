import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Route protection. Signed-in areas live under /dashboard and /onboarding.
 *
 * - Supabase mode: refresh the auth cookies and read the user (the documented
 *   `@supabase/ssr` pattern).
 * - Local mode: only check that the session cookie is present; the signature
 *   and expiry are verified server-side by every page and action.
 */
const PROTECTED = ['/dashboard', '/onboarding'];
const LOCAL_SESSION_COOKIE = 'qf_session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (!isProtected && !isAuthPage) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseMode = Boolean(supabaseUrl && supabaseAnonKey && process.env.DATABASE_URL);

  let response = NextResponse.next({ request });
  let signedIn = false;

  if (supabaseMode) {
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
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
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (isAuthPage && signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/login', '/signup'],
};
