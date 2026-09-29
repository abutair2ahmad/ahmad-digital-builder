import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { rubik } from '../fonts';
import '../globals.css';

// Single owner, Arabic only. Never indexed (also X-Robots-Tag in next.config.ts).
export const metadata: Metadata = {
  title: { default: 'لوحة التحكم', template: '%s | لوحة جمرة' },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: '#1a1816', colorScheme: 'dark' };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={rubik.variable}>
      <body>{children}</body>
    </html>
  );
}
