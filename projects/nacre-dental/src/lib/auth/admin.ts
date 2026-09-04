import 'server-only';
import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { constantTimeEquals } from '@/lib/booking/tokens';
import { ADMIN_COOKIE } from './constants';

export { ADMIN_COOKIE };

/**
 * Stateless admin session: `<expiry>.<hmac(expiry)>` in an HttpOnly cookie.
 *
 * The password itself never travels beyond the login POST and is never stored
 * client-side. Rotating BOOKING_TOKEN_SECRET invalidates every live session.
 */
function sign(payload: string): string {
  return createHmac('sha256', config.security.tokenSecret).update(`admin:${payload}`).digest('base64url');
}

export function issueSession(): { value: string; maxAge: number } {
  const maxAge = Math.max(1, config.security.sessionHours) * 3600;
  const expiresAt = Date.now() + maxAge * 1000;
  const payload = String(expiresAt);
  return { value: `${payload}.${sign(payload)}`, maxAge };
}

export function isValidSession(value: string | undefined): boolean {
  if (!value) return false;
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return false;

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!constantTimeEquals(signature, sign(payload))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function checkPassword(candidate: string): boolean {
  // Compare hashes rather than raw strings so neither the value nor its
  // length leaks through timing.
  const digest = (value: string) => createHmac('sha256', config.security.tokenSecret).update(value).digest('hex');
  return constantTimeEquals(digest(candidate), digest(config.security.adminPassword));
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(ADMIN_COOKIE)?.value);
}
