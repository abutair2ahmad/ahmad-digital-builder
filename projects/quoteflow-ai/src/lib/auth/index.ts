import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { config } from '@/lib/config';
import type { AuthProvider, AuthUser } from './types';

export type { AuthUser, AuthProvider, AuthResult } from './types';

export async function getAuth(): Promise<AuthProvider> {
  if (config.mode === 'supabase') {
    const { supabaseAuth } = await import('./supabase');
    return supabaseAuth;
  }
  const { localAuth } = await import('./local');
  return localAuth;
}

/** Current user, memoised per request. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const auth = await getAuth();
  return auth.getUser();
});

export async function requireUser(next?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  return user;
}
