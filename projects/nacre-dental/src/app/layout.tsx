import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { clinic } from '@/lib/content/clinic';
import { config } from '@/lib/config';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: `${clinic.name} — ${clinic.descriptor}, Dubai`,
    template: `%s — ${clinic.name}`,
  },
  description: clinic.positioning,
  keywords: [
    'cosmetic dentistry Dubai',
    'porcelain veneers',
    'digital smile design',
    'dental implants',
    'Invisalign Dubai',
  ],
  openGraph: {
    type: 'website',
    siteName: clinic.name,
    title: `${clinic.name} — ${clinic.descriptor}`,
    description: clinic.positioning,
    locale: 'en_AE',
  },
  twitter: { card: 'summary_large_image', title: clinic.name, description: clinic.positioning },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230d1211'/%3E%3Ctext x='16' y='22' font-family='Georgia,serif' font-size='17' fill='%23fbf9f5' text-anchor='middle'%3EN%3C/text%3E%3C/svg%3E",
        type: 'image/svg+xml',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#fbf9f5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        {/* Motion applies its entry styles inline; without JavaScript those
            elements would stay invisible. This reveals them instead. */}
        <noscript>
          <style>{'[style*="opacity:0"]{opacity:1!important;transform:none!important}'}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-porcelain"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
