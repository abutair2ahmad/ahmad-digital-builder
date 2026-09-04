import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '@/lib/config';

/**
 * Patients manage their appointment through an unguessable, stateless token.
 *
 * token   = `<bookingId>.<hmac(bookingId)>`
 * storage = only the SHA of the hmac half is written to the database, so a
 *           database dump alone does not hand out working management links.
 */
function sign(value: string, purpose: string): string {
  return createHmac('sha256', config.security.tokenSecret)
    .update(`${purpose}:${value}`)
    .digest('base64url');
}

export function createManageToken(bookingId: string): { token: string; hash: string } {
  const signature = sign(bookingId, 'manage');
  return {
    token: `${bookingId}.${signature}`,
    hash: createHmac('sha256', config.security.tokenSecret).update(signature).digest('hex'),
  };
}

/** Returns the booking id when the token is authentic, otherwise null. */
export function verifyManageToken(token: string): { bookingId: string; hash: string } | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const bookingId = token.slice(0, separator);
  const provided = token.slice(separator + 1);
  const expected = sign(bookingId, 'manage');

  if (!constantTimeEquals(provided, expected)) return null;

  return {
    bookingId,
    hash: createHmac('sha256', config.security.tokenSecret).update(expected).digest('hex'),
  };
}

export function manageUrl(token: string): string {
  return `${config.appUrl}/appointment/${token}`;
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
