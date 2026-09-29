import type { MetadataRoute } from 'next';
import { siteIndexable, siteUrl } from '@/lib/config';
import { LOCALES, localePath } from '@/lib/i18n/config';

const PATHS = ['/', '/info', '/for-restaurants'];

/** Empty unless SITE_INDEXABLE=true (the concept site is noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteIndexable()) return [];
  const base = siteUrl();
  return PATHS.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${base}${localePath(locale, path)}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}${localePath(l, path)}`])) },
    })),
  );
}
