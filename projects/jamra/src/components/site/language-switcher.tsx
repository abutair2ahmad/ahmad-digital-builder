'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSite } from '@/components/providers';
import { LOCALE_COOKIE, LOCALE_META, LOCALES } from '@/lib/i18n/config';
import type { Locale } from '@/lib/types';

function remember(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function Segments({ hrefFor }: { hrefFor: (l: Locale) => string }) {
  const { locale, dict } = useSite();
  return (
    <nav aria-label={dict.nav.language} className="flex rounded-full border border-border bg-surface p-0.5 text-xs">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={hrefFor(l)}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? 'true' : undefined}
          onClick={() => remember(l)}
          className={`grid min-h-11 min-w-11 place-items-center rounded-full px-2 font-medium transition-colors ${
            l === locale ? 'bg-elevated text-text' : 'text-muted hover:text-text'
          }`}
        >
          {LOCALE_META[l].switcherLabel}
        </Link>
      ))}
    </nav>
  );
}

/** Same page in another language: "عربي / עב / EN", each in its own language. */
export function LanguageSwitcher() {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(ar|he|en)(?=\/|$)/, '');
  return <Segments hrefFor={(l) => `/${l}${rest}`} />;
}

/** Suspense fallback: links to each language's home. */
export function LanguageSwitcherFallback() {
  return <Segments hrefFor={(l) => `/${l}`} />;
}
