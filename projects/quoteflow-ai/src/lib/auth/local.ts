import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { getDb } from '@/lib/db';
import type { AuthProvider, AuthUser } from './types';

export const LOCAL_SESSION_COOKIE = 'qf_session';
const SESSION_DAYS = 14;

/**
 * Local-mode authentication: users in the shimmed `auth.users` table,
 * scrypt-hashed passwords, and a server-side session referenced by an
 * HMAC-signed cookie. Sign-ups fire the same `on_auth_user_created` trigger
 * Supabase would, so the profile row is created identically in both modes.
 */

function secret(): string {
  if (config.authSecret) return config.authSecret;
  const file = path.join(process.cwd(), config.dataDir, 'auth-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const generated = randomBytes(32).toString('hex');
    fs.writeFileSync(file, generated, { mode: 0o600 });
    return generated;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

function parseCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const [id, sig] = raw.split('.');
  if (!id || !sig) return null;
  const expected = sign(id);
  if (expected.length !== sig.length) return null;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig)) ? id : null;
}

async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const row = await db.admin.one<{ id: string }>(
    `insert into auth.sessions (user_id, expires_at) values ($1, $2) returning id`,
    [userId, expires.toISOString()],
  );
  const store = await cookies();
  store.set(LOCAL_SESSION_COOKIE, `${row!.id}.${sign(row!.id)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
}

export const localAuth: AuthProvider = {
  async signUp({ email, password, fullName }) {
    const db = await getDb();
    const existing = await db.admin.one(`select id from auth.users where lower(email) = lower($1)`, [email]);
    if (existing) return { ok: false, error: 'An account with this email already exists.' };
    const user = await db.admin.one<AuthUser>(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values (lower($1), $2, $3) returning id, email`,
      [email, hashPassword(password), JSON.stringify({ full_name: fullName })],
    );
    await createSession(user!.id);
    return { ok: true, user: user! };
  },

  async signIn({ email, password }) {
    const db = await getDb();
    const row = await db.admin.one<{ id: string; email: string; encrypted_password: string | null }>(
      `select id, email, encrypted_password from auth.users where lower(email) = lower($1)`,
      [email],
    );
    if (!row || !verifyPassword(password, row.encrypted_password)) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    await createSession(row.id);
    return { ok: true, user: { id: row.id, email: row.email } };
  },

  async signOut() {
    const store = await cookies();
    const id = parseCookie(store.get(LOCAL_SESSION_COOKIE)?.value);
    if (id) {
      const db = await getDb();
      await db.admin.query(`delete from auth.sessions where id = $1`, [id]);
    }
    store.delete(LOCAL_SESSION_COOKIE);
  },

  async getUser() {
    const store = await cookies();
    const id = parseCookie(store.get(LOCAL_SESSION_COOKIE)?.value);
    if (!id) return null;
    const db = await getDb();
    return db.admin.one<AuthUser>(
      `select u.id, u.email from auth.sessions s join auth.users u on u.id = s.user_id
       where s.id = $1 and s.expires_at > now()`,
      [id],
    );
  },

  async adminCreateUser({ email, password, fullName }) {
    const db = await getDb();
    const user = await db.admin.one<AuthUser>(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values (lower($1), $2, $3)
       on conflict (email) do update set encrypted_password = excluded.encrypted_password
       returning id, email`,
      [email, hashPassword(password), JSON.stringify({ full_name: fullName })],
    );
    return user!;
  },
};
