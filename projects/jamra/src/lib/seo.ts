import type { Metadata } from 'next';
import { siteIndexable, siteUrl } from '@/lib/config';
import { LOCALE_META, LOCALES, localePath } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n';
import type { Locale, MenuData, OpeningHours } from '@/lib/types';

export const TITLE_TEMPLATE: Record<Locale, string> = {
  ar: '%s | جمرة',
  he: '%s | ג\'מרה',
  en: '%s | JAMRA',
};

/** Canonical + hreflang for a page that exists in all three locales. */
export function alternates(locale: Locale, path = '/'): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(l, path);
  // `/` negotiates the language; deeper pages default to Arabic.
  languages['x-default'] = path === '/' ? '/' : localePath('ar', path);
  return { canonical: localePath(locale, path), languages };
}

export function pageMetadata(locale: Locale, path: string, title: string | { absolute: string }, description: string): Metadata {
  const dict = getDictionary(locale);
  const plainTitle = typeof title === 'string' ? title : title.absolute;
  return {
    title,
    description,
    alternates: alternates(locale, path),
    openGraph: {
      type: 'website',
      siteName: dict.meta.siteName,
      title: plainTitle,
      description,
      url: localePath(locale, path),
      locale: LOCALE_META[locale].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_META[l].ogLocale),
    },
    twitter: { card: 'summary', title: plainTitle, description },
  };
}

/** Layout-level metadata shared by every public page. */
export function baseMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: dict.meta.homeTitle, template: TITLE_TEMPLATE[locale] },
    description: dict.meta.homeDescription,
    applicationName: dict.meta.siteName,
    // A concept site: noindex (but follow) unless SITE_INDEXABLE=true.
    robots: siteIndexable() ? { index: true, follow: true } : { index: false, follow: true },
    creator: 'Nexora',
  };
}

const NEXORA = { '@type': 'Organization', name: 'Nexora', url: 'https://instagram.com/bynexora.co' };

/** Portfolio JSON-LD: only WebSite/WebPage credited to Nexora. No address, hours, prices or ratings. */
export function portfolioJsonLd(locale: Locale, path: string, name: string, description: string) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${base}/#website`, name: getDictionary(locale).meta.siteName, url: `${base}/`, inLanguage: ['ar', 'he', 'en'], creator: NEXORA },
      {
        '@type': 'WebPage',
        '@id': `${base}${localePath(locale, path)}#webpage`,
        url: `${base}${localePath(locale, path)}`,
        name,
        description,
        inLanguage: locale,
        isPartOf: { '@id': `${base}/#website` },
        creator: NEXORA,
      },
    ],
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Restaurant JSON-LD for a real client deployment (SITE_MODE=client) only.
 * Never used for the JAMRA concept: it has no real address or phone.
 */
export function restaurantJsonLd(opts: { locale: Locale; menu: MenuData; name: string; telephone: string; address: Record<string, string> }) {
  const hours = opts.menu.settings.opening_hours as OpeningHours;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: opts.name,
    url: `${siteUrl()}${localePath(opts.locale)}`,
    telephone: opts.telephone,
    address: { '@type': 'PostalAddress', ...opts.address },
    servesCuisine: ['Middle Eastern', 'Grill'],
    acceptsReservations: false,
    openingHoursSpecification: Object.entries(hours).flatMap(([day, ranges]) =>
      (ranges ?? []).map(([opens, closes]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_NAMES[Number(day)], opens, closes })),
    ),
  };
}

/** Safe for <script type="application/ld+json">. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
