import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';
import type { AuthProvider } from './types';

/**
 * Supabase Auth through `@supabase/ssr`. Sessions live in Supabase-managed
 * cookies; `proxy.ts` refreshes them on every request.
 */
export async function supabaseServerClient() {
  const store = await cookies();
  return createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there and
          // the proxy already refreshed the session.
        }
      },
    },
  });
}

function adminClient() {
  if (!config.supabase.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation.');
  }
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const supabaseAuth: AuthProvider = {
  async signUp({ email, password, fullName }) {
    const supabase = await supabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.session || !data.user) return { ok: true, user: null, needsEmailConfirmation: true };
    return { ok: true, user: { id: data.user.id, email: data.user.email ?? email } };
  },

  async signIn({ email, password }) {
    const supabase = await supabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: 'Incorrect email or password.' };
    return { ok: true, user: { id: data.user.id, email: data.user.email ?? email } };
  },

  async signOut() {
    const supabase = await supabaseServerClient();
    await supabase.auth.signOut();
  },

  async getUser() {
    const supabase = await supabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? '' };
  },

  async adminCreateUser({ email, password, fullName }) {
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'Could not create user');
    return { id: data.user.id, email: data.user.email ?? email };
  },
};
