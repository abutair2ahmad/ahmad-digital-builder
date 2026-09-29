import type { Locale } from '@/lib/types';

export const LOCALES: readonly Locale[] = ['ar', 'he', 'en'];
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'jamra_locale';

export const LOCALE_META: Record<Locale, { dir: 'rtl' | 'ltr'; ogLocale: string; switcherLabel: string; nativeName: string }> = {
  ar: { dir: 'rtl', ogLocale: 'ar_AR', switcherLabel: 'عربي', nativeName: 'العربية' },
  he: { dir: 'rtl', ogLocale: 'he_IL', switcherLabel: 'עב', nativeName: 'עברית' },
  en: { dir: 'ltr', ogLocale: 'en_US', switcherLabel: 'EN', nativeName: 'English' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export const dirOf = (locale: Locale) => LOCALE_META[locale].dir;

/** Best match from an Accept-Language header, or null. */
export function negotiateLocale(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    // "iw" is the legacy code for Hebrew.
    const mapped = base === 'iw' ? 'he' : base;
    if (isLocale(mapped)) return mapped;
  }
  return null;
}

/** `/checkout` → `/he/checkout`. */
export function localePath(locale: Locale, path = '/'): string {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
