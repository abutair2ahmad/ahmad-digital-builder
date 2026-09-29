import type { Locale } from '@/lib/types';
import ar, { type Dictionary } from './dictionaries/ar';
import he from './dictionaries/he';
import en from './dictionaries/en';

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { ar, he, en };

/** Dictionaries are plain modules (~6 KB each), safe on server and client. */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

