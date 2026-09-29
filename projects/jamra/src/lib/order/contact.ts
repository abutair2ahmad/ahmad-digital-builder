/**
 * The number orders are sent to. The seed and the migration ship a
 * placeholder (972500000000); it must never become a wa.me or tel: link,
 * because real visitors would send their name, phone and address to it.
 */
export const PLACEHOLDER_WHATSAPP = '972500000000';

export function usableWhatsapp(number: string | null | undefined): string | null {
  const digits = number?.replace(/\D/g, '') ?? '';
  if (!/^[1-9][0-9]{7,14}$/.test(digits) || digits === PLACEHOLDER_WHATSAPP) return null;
  return digits;
}
