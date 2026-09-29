import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicSupabase } from '@/lib/config';

/**
 * Service-role client. Only place_order uses it; the key never leaves the
 * server (no NEXT_PUBLIC_ prefix, and this module is server-only).
 */
export function createAdminClient(): SupabaseClient | null {
  const env = publicSupabase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) return null;
  return createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
