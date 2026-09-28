import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, dirOf, isLocale, LOCALE_HEADER, type Locale } from './config';
import { dictionaryFor, type Dictionary } from './index';

/**
 * The locale for the current request. The proxy resolves it from the URL
 * prefix (or the visitor's cookie / Accept-Language) and passes it on as a
 * request header, so nothing below needs to know how routing works.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export interface ServerI18n {
  locale: Locale;
  dict: Dictionary;
  dir: 'ltr' | 'rtl';
}

export const getI18n = cache(async (): Promise<ServerI18n> => {
  const locale = await getLocale();
  return { locale, dict: dictionaryFor(locale), dir: dirOf(locale) };
});
