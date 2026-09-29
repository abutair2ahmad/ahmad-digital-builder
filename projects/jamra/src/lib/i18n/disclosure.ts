import type { Dictionary } from '@/lib/i18n/dictionaries/ar';

/** The photo sentence (stock photos, illustration only) appears only when dishes have photos. */
export function disclosureText(dict: Dictionary, hasPhotos: boolean): string {
  return hasPhotos ? `${dict.disclosure.text} ${dict.disclosure.stockPhotos}` : dict.disclosure.text;
}

export const hasDishPhotos = (items: Array<{ image_path: string | null }>) => items.some((i) => Boolean(i.image_path));
