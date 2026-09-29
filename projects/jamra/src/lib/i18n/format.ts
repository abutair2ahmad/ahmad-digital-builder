import type { Locale } from '@/lib/types';

const priceFormatters = new Map<Locale, Intl.NumberFormat>();

/** ₪ amount with Western digits in every locale. Wrap the output in <bdi>. */
export function formatPrice(amount: number, locale: Locale): string {
  let f = priceFormatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(`${locale}-IL-u-nu-latn`, {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    priceFormatters.set(locale, f);
  }
  return f.format(amount);
}

/** Plain "₪96" / "₪6.50" for WhatsApp text, where bidi marks would leak. */
export function formatPlainPrice(amount: number): string {
  return `₪${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/** Replaces {name} placeholders. Unknown placeholders stay visible. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}
