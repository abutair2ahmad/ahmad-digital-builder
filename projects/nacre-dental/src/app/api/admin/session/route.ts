import { cookies } from 'next/headers';
import { ADMIN_COOKIE, checkPassword, issueSession } from '@/lib/auth/admin';
import { badRequest, json, readJson, tooMany, unauthorized } from '@/lib/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** POST /api/admin/session — exchange the clinic password for a signed session. */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'admin-login'), 6, 15 * 60_000);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const body = await readJson(request);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) return badRequest('Enter the clinic password.');
  if (!checkPassword(password)) return unauthorized('That password is not correct.');

  const session = issueSession();
  const store = await cookies();
  store.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: session.maxAge,
  });

  return json({ ok: true });
}

/** DELETE /api/admin/session — sign out. */
export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return json({ ok: true });
}
