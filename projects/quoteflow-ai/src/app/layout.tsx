import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Arabic } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/lib/i18n/client';
import { getI18n } from '@/lib/i18n/server';
import { config } from '@/lib/config';
import { ensureDemoSeed } from '@/lib/seed/demo';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });
const notoArabic = Noto_Sans_Arabic({ variable: '--font-noto-arabic', subsets: ['arabic'], display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const { dict, locale } = await getI18n();
  return {
    metadataBase: new URL(config.appUrl),
    title: { default: dict.landing.metaTitle, template: `%s — ${dict.common.appName} AI` },
    description: dict.landing.metaDescription,
    alternates: {
      canonical: locale === 'ar' ? '/ar' : '/',
      languages: { en: '/', ar: '/ar' },
    },
    openGraph: {
      type: 'website',
      siteName: `${dict.common.appName} AI`,
      title: dict.landing.metaTitle,
      description: dict.landing.metaDescription,
      locale: locale === 'ar' ? 'ar' : 'en',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#fafaf9',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  await ensureDemoSeed();
  const { locale, dir } = await getI18n();
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
          {children}
          <Toaster position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} richColors dir={dir} />
        </I18nProvider>
      </body>
    </html>
  );
}
