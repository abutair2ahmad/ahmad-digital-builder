import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicSupabase } from '@/lib/config';

/** Cookie-bound client for the dashboard (owner session, RLS applies). */
export async function createSessionClient() {
  const env = publicSupabase();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; the proxy refreshes the session.
        }
      },
    },
  });
}
