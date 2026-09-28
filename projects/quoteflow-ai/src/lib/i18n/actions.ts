'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLocale, LOCALE_COOKIE, localePath } from './config';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Remember the visitor's choice and send them to the same page in the other
 * language. The cookie is written on the server so the proxy sees it on the
 * very next request and does not negotiate a different locale back.
 */
export async function switchLocaleAction(locale: string, path: string, query: string): Promise<void> {
  if (!isLocale(locale)) return;
  // Only in-app paths: never redirect to something a caller supplied wholesale.
  const safePath = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  const safeQuery = query && !query.includes('//') ? query : '';
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
  redirect(`${localePath(safePath, locale)}${safeQuery ? `?${safeQuery}` : ''}`);
}
