import type { LeadStatus, QuoteStatus, RuleType } from '@/lib/types';

export function formatMoney(amount: number | null | undefined, currency = 'ILS'): string {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat('en-IL', { style: 'currency', currency, maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export function formatNumber(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  return formatDate(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  qualified: 'Qualified',
  quote_sent: 'Quote sent',
  won: 'Won',
  lost: 'Lost',
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const RULE_TYPE_LABEL: Record<RuleType, string> = {
  fixed: 'Fixed price',
  per_unit: 'Price per unit',
  percentage: 'Percentage modifier',
  minimum: 'Minimum price',
  location_surcharge: 'Location surcharge',
  addon: 'Optional add-on',
};

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
