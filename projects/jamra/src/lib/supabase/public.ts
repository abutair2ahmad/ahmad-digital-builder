import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicSupabase } from '@/lib/config';

/**
 * Cookie-less anon client for the public menu. It must not touch cookies so
 * the menu stays cacheable ('use cache' forbids request data).
 */
export function createPublicClient(): SupabaseClient | null {
  const env = publicSupabase();
  if (!env) return null;
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
