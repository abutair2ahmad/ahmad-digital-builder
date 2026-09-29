import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

if (process.argv.includes('build') && !process.env.NEXT_PUBLIC_SITE_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  console.warn('⚠ [jamra] NEXT_PUBLIC_SITE_URL is not set (and no VERCEL_PROJECT_PRODUCTION_URL): canonical, hreflang and Open Graph URLs will point at http://localhost:3000.');
}

/** Supabase REST + realtime origins, if configured. */
function supabaseOrigins(): string[] {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    return [url.origin, `wss://${url.host}`];
  } catch {
    return [];
  }
}

/**
 * Static pages can't carry per-request nonces, so inline scripts (Next's
 * flight data, JSON-LD) need 'unsafe-inline'. Everything else is locked to
 * our own origin; dev adds 'unsafe-eval' for React's dev tooling.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigins().join(' ')}${isDev ? ' ws:' : ''}`.trim(),
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 'use cache' + cacheTag/updateTag for the menu (see src/lib/data/menu.ts).
  cacheComponents: true,
  experimental: {
    // Root layouts live under app/[locale] and app/dashboard, so the 404 for
    // unmatched URLs is app/global-not-found.tsx.
    globalNotFound: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75],
    // Only our own photos may be optimized: dish photos and imported assets (the hero).
    localPatterns: [
      { pathname: '/menu/**', search: '' },
      { pathname: '/_next/static/media/**', search: '' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/dashboard/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
