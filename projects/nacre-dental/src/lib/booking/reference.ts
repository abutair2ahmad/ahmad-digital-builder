import { randomBytes, randomUUID } from 'node:crypto';

/** Characters chosen to stay unambiguous when read aloud on the phone. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Human-facing reference, e.g. `NC-7K4Q-2M9X`.
 *
 * It is spoken to patients, so it is *not* treated as a secret: management
 * links use a separate HMAC token (see `lib/booking/tokens.ts`).
 */
export function generateBookingReference(): string {
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 3) out += '-';
  }
  return `NC-${out}`;
}

export function generateId(): string {
  return randomUUID();
}
