import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteProvider } from '@/components/providers';
import { DisclosureBar } from '@/components/site/disclosure-bar';
import { Footer } from '@/components/site/footer';
import { Header } from '@/components/site/header';
import { dataMode } from '@/lib/config';
import { getMenu } from '@/lib/data/menu';
import { getDictionary } from '@/lib/i18n';
import { disclosureText, hasDishPhotos } from '@/lib/i18n/disclosure';
import { formatOpeningHours } from '@/lib/i18n/hours-text';
import { dirOf, isLocale, LOCALES } from '@/lib/i18n/config';
import { baseMetadata } from '@/lib/seo';
import { rubik } from '../fonts';
import '../globals.css';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return baseMetadata(locale);
}

export const viewport: Viewport = {
  themeColor: '#121110',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Root layout for the public site: <html lang dir> is set here, server-side. */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const menu = await getMenu();

  return (
    <html lang={locale} dir={dirOf(locale)} className={rubik.variable}>
      <body>
        <SiteProvider value={{ locale, dict, menu, demo: dataMode() === 'demo' }}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-ember focus:px-3 focus:py-2 focus:text-on-ember">
            {dict.nav.skip}
          </a>
          <DisclosureBar />
          <Header locale={locale} dict={dict} />
          <main id="main">{children}</main>
          <Footer
            locale={locale}
            dict={dict}
            hoursText={formatOpeningHours(menu.settings.opening_hours, locale)}
            disclosure={disclosureText(dict, hasDishPhotos(menu.items))}
          />
        </SiteProvider>
      </body>
    </html>
  );
}
