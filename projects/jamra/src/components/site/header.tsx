import Link from 'next/link';
import { Suspense } from 'react';
import { OpenStatus } from '@/components/site/open-status';
import { LanguageSwitcher, LanguageSwitcherFallback } from '@/components/site/language-switcher';
import { localePath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4">
        <Link href={localePath(locale)} aria-label={dict.nav.home} className="flex min-h-11 items-center gap-2 font-bold">
          <span aria-hidden className="size-2.5 rounded-full bg-ember shadow-[0_0_12px_rgb(255_107_26/0.8)]" />
          <span className="text-lg">{dict.meta.siteName}</span>
        </Link>
        <OpenStatus />
        <div className="ms-auto flex items-center gap-2">
          <Link href={localePath(locale, '/info')} className="hidden min-h-11 items-center px-2 text-sm text-muted hover:text-text sm:flex">
            {dict.nav.info}
          </Link>
          <Suspense fallback={<LanguageSwitcherFallback />}>
            <LanguageSwitcher />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
