import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { localePath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

/** `hoursText` comes from settings.opening_hours, so it matches what the owner set. */
export function Footer({ locale, dict, hoursText, disclosure }: { locale: Locale; dict: Dictionary; hoursText: string; disclosure: string }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface pb-28">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div>
          <p className="font-bold">{dict.meta.siteName}</p>
          <h2 className="mt-4 text-sm font-medium text-muted">{dict.footer.hours}</h2>
          <p className="tabular mt-1 text-sm">{hoursText}</p>
          <Link href={localePath(locale, '/info')} className="mt-3 inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline">
            {dict.footer.info}
          </Link>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <Link
            href={localePath(locale, '/for-restaurants')}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-text underline-offset-4 hover:underline"
          >
            {dict.footer.forOwners}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted">{disclosure}</p>
      </div>
    </footer>
  );
}
