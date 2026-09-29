import type { Metadata } from 'next';
import Link from 'next/link';
import { rubik } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: '404 — جمرة · ג\'מרה · JAMRA',
  robots: { index: false, follow: false },
};

/** Unmatched URLs (and unknown locale prefixes). Trilingual, no layout. */
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className={rubik.variable}>
      <body className="grid min-h-dvh place-items-center p-6">
        <main className="card grid max-w-md gap-4 p-8 text-center">
          <p className="text-5xl font-bold text-ember">404</p>
          <p>الصفحة مش موجودة.</p>
          <p lang="he" dir="rtl">הדף לא נמצא.</p>
          <p lang="en" dir="ltr">Page not found.</p>
          <nav className="flex justify-center gap-2">
            <Link href="/ar" className="btn btn-secondary" lang="ar">عربي</Link>
            <Link href="/he" className="btn btn-secondary" lang="he">עב</Link>
            <Link href="/en" className="btn btn-secondary" lang="en">EN</Link>
          </nav>
        </main>
      </body>
    </html>
  );
}
