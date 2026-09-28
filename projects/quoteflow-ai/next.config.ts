import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Native / WASM packages stay outside the server bundle.
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'pdfkit'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/dashboard/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }] },
    ];
  },
};

export default nextConfig;
