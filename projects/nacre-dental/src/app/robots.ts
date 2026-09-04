import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const base = config.appUrl.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private appointment links and the clinic diary must never be crawled.
        disallow: ['/dashboard', '/appointment/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
