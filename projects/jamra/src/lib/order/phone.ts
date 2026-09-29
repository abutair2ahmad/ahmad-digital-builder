/**
 * Israeli mobile numbers only: orders are confirmed on WhatsApp.
 * Accepts 050-1234567, 0501234567, +972 50 123 4567, 972501234567, 00972…
 * Returns E.164 (+9725XXXXXXXX) or null.
 */
export function normalizeIsraeliMobile(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  let digits = raw.trim().replace(/[\s\-().‎‏]/g, '');
  if (digits.startsWith('+972')) digits = digits.slice(4);
  else if (digits.startsWith('00972')) digits = digits.slice(5);
  else if (digits.startsWith('972') && digits.length === 12) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^5\d{8}$/.test(digits)) return null;
  return `+972${digits}`;
}

/** +972501234567 → 050-1234567 (how people in Israel read a number). */
export function formatLocalPhone(e164: string): string {
  const m = /^\+9725(\d)(\d{7})$/.exec(e164);
  return m ? `05${m[1]}-${m[2]}` : e164;
}
