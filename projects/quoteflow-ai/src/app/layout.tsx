import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { config } from '@/lib/config';
import { ensureDemoSeed } from '@/lib/seed/demo';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: { default: 'QuoteFlow AI — Instant, rule-based quotes for service businesses', template: '%s — QuoteFlow AI' },
  description:
    'QuoteFlow AI qualifies leads with an AI assistant, prices every job from your own pricing rules, and turns the result into a professional quote — automatically.',
  openGraph: {
    type: 'website',
    siteName: 'QuoteFlow AI',
    title: 'QuoteFlow AI — Instant, rule-based quotes for service businesses',
    description: 'AI qualification, deterministic pricing, professional PDF quotes and a lightweight CRM in one workspace.',
  },
};

export const viewport: Viewport = {
  themeColor: '#fafaf9',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  await ensureDemoSeed();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
