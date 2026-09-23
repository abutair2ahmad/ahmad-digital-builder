'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/client';
import { switchLocaleAction } from '@/lib/i18n/actions';
import { LOCALES, LOCALE_META, stripLocale, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

/** Switches locale in place: same page, other language. */
export function LanguageSwitcher({ variant = 'ghost', className }: { variant?: 'ghost' | 'outline'; className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    const { path } = stripLocale(pathname);
    start(() => {
      void switchLocaleAction(next, path, searchParams.toString());
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className={cn('gap-1.5', className)} disabled={pending} aria-label={dict.common.switchLanguage}>
          <Languages className="size-4" />
          <span className="hidden sm:inline">{LOCALE_META[locale].nativeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => choose(l)} className={cn(l === locale && 'font-semibold')}>
            <span lang={LOCALE_META[l].htmlLang}>{LOCALE_META[l].nativeLabel}</span>
            {l === locale ? <span className="ms-auto text-xs text-muted-foreground">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
