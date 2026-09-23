import type { Dictionary, Locale } from '@/lib/i18n';
import { fill } from '@/lib/i18n';
import type { LeadStatus, QuoteStatus, RuleType } from '@/lib/types';

/**
 * Arabic uses `-u-nu-latn`: Arabic grouping and currency placement, but Latin
 * digits — a quote is a financial document and digit shape should never be
 * ambiguous between locales.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-IL',
  ar: 'ar-u-nu-latn',
};

export function formatMoney(amount: number | null | undefined, currency = 'ILS', locale: Locale = 'en'): string {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: 'currency',
      currency,
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export function formatNumber(n: number | null | undefined, locale: Locale = 'en'): string {
  return Number(n ?? 0).toLocaleString(INTL_LOCALE[locale], { maximumFractionDigits: 2 });
}

export function formatDate(
  iso: string | null | undefined,
  locale: Locale = 'en',
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn-ca-gregory' : 'en-GB', opts).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = 'en'): string {
  return formatDate(iso, locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string, dict: Dictionary, locale: Locale = 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return dict.common.justNow;
  if (m < 60) return fill(dict.common.minutesAgo, { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return fill(dict.common.hoursAgo, { n: h });
  const d = Math.round(h / 24);
  if (d < 30) return fill(dict.common.daysAgo, { n: d });
  return formatDate(iso, locale, { day: 'numeric', month: 'short' });
}

export function leadStatusLabel(status: LeadStatus, dict: Dictionary): string {
  return dict.status.lead[status];
}

export function quoteStatusLabel(status: QuoteStatus, dict: Dictionary): string {
  return dict.status.quote[status];
}

export function ruleTypeLabel(type: RuleType, dict: Dictionary): string {
  return dict.ruleType[type];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Ensure a colour is a usable hex value; falls back to the default brand colour. */
export function safeHex(color: string | null | undefined, fallback = '#2563eb'): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

/** Black or white text for a given background hex, by relative luminance. */
export function contrastText(hex: string): '#ffffff' | '#111111' {
  const c = safeHex(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.45 ? '#111111' : '#ffffff';
}
