/**
 * Locales.
 *
 * English is served unprefixed (`/dashboard`) so every link already shared —
 * including the quote URLs printed on PDFs that customers already hold —
 * keeps working. Arabic is served under `/ar` (`/ar/dashboard`), which the
 * proxy rewrites back onto the same routes with the locale in a header.
 */
export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_HEADER = 'x-quoteflow-locale';
export const LOCALE_COOKIE = 'qf_locale';

export const LOCALE_META: Record<Locale, { label: string; nativeLabel: string; dir: 'ltr' | 'rtl'; htmlLang: string }> = {
  en: { label: 'English', nativeLabel: 'English', dir: 'ltr', htmlLang: 'en' },
  ar: { label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', htmlLang: 'ar' },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): 'ltr' | 'rtl' {
  return LOCALE_META[locale].dir;
}

/** `/dashboard` → `/ar/dashboard` for Arabic; unchanged for English. */
export function localePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  if (path === '/') return `/${locale}`;
  return `/${locale}${path}`;
}

/** `/ar/dashboard` → `/dashboard`. Used for nav matching and locale switching. */
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (pathname === `/${locale}`) return { locale, path: '/' };
    if (pathname.startsWith(`/${locale}/`)) return { locale, path: pathname.slice(locale.length + 1) };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** Best supported locale for an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split('=')[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
