'use server';

import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { fieldErrorsOf, loginSchema, signupSchema, type FormState } from '@/lib/validation';

function safeNext(value: FormDataEntryValue | null): string | null {
  const v = typeof value === 'string' ? value : '';
  return v.startsWith('/') && !v.startsWith('//') ? v : null;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  const auth = await getAuth();
  const result = await auth.signUp(parsed.data);
  if (!result.ok) return { error: result.error };
  if (result.needsEmailConfirmation) {
    return { ok: true, error: undefined, fieldErrors: undefined, stamp: -1 };
  }
  redirect('/onboarding');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  const auth = await getAuth();
  const result = await auth.signIn(parsed.data);
  if (!result.ok) return { error: result.error };
  const next = safeNext(formData.get('next'));
  if (next) redirect(next);
  // Send people without a workspace straight to onboarding.
  const db = await getDb();
  const membership = result.user
    ? await db.asUser(result.user.id, (tx) => tx.one(`select workspace_id from public.workspace_members where user_id = $1 limit 1`, [result.user!.id]))
    : null;
  redirect(membership ? '/dashboard' : '/onboarding');
}

export async function signOutAction(): Promise<void> {
  const auth = await getAuth();
  await auth.signOut();
  redirect('/login');
}
