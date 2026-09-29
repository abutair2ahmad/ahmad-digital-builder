import { formatPrice } from '@/lib/i18n/format';
import type { Locale } from '@/lib/types';

/** Prices are isolated from the surrounding RTL text and use tabular digits. */
export function Price({ amount, locale, className = '' }: { amount: number; locale: Locale; className?: string }) {
  return <bdi className={`tabular ${className}`}>{formatPrice(amount, locale)}</bdi>;
}
