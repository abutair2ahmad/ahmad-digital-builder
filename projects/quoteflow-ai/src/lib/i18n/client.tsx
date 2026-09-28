'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { dictionaryFor, fill, type Dictionary } from './index';
import { dirOf, localePath, type Locale } from './config';

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
  dir: 'ltr' | 'rtl';
  /** Interpolate a template from the dictionary: `t(d.leads.markedAs, { status })`. */
  t: (template: string, vars?: Record<string, string | number | undefined>) => string;
  /** Prefix an app path with the active locale. */
  href: (path: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dict: dictionaryFor(locale),
      dir: dirOf(locale),
      t: fill,
      href: (path: string) => localePath(path, locale),
    }),
    [locale],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>.');
  return value;
}
