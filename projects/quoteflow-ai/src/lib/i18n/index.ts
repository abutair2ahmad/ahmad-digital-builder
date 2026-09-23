import { en, type Dictionary } from './dictionaries/en';
import { ar } from './dictionaries/ar';
import { DEFAULT_LOCALE, type Locale } from './config';

export const dictionaries: Record<Locale, Dictionary> = { en, ar };

export type { Dictionary } from './dictionaries/en';
export * from './config';

export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Replace `{name}` placeholders. Values are stringified; missing keys stay as written. */
export function fill(template: string, vars: Record<string, string | number | undefined> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}
