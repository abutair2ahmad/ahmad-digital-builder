import type { MetadataRoute } from 'next';
import { siteIndexable, siteUrl } from '@/lib/config';

/**
 * Crawling stays allowed so bots can read the pages' noindex; the dashboard
 * is off limits. The sitemap is only advertised when SITE_INDEXABLE=true.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard'] },
    ...(siteIndexable() ? { sitemap: `${siteUrl()}/sitemap.xml` } : {}),
  };
}
