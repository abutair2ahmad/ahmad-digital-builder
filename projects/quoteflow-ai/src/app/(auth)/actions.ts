'use server';

import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { fieldErrorsOf, loginSchema, signupSchema, type FormState } from '@/lib/validation';

function safeNext(value: FormDataEntryValue | null): string | null {
  const v = typeof value === 'string' ? value : '';
  return v.startsWith('/') && !v.startsWith('//') ? v : null;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d, locale } = await getI18n();
  const parsed = signupSchema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) };
  const auth = await getAuth();
  const result = await auth.signUp(parsed.data);
  if (!result.ok) return { error: result.error };
  if (result.needsEmailConfirmation) {
    return { ok: true, error: undefined, fieldErrors: undefined, stamp: -1 };
  }
  redirect(localePath('/onboarding', locale));
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d, locale } = await getI18n();
  const parsed = loginSchema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) };
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
  redirect(localePath(membership ? '/dashboard' : '/onboarding', locale));
}

export async function signOutAction(): Promise<void> {
  const { locale } = await getI18n();
  const auth = await getAuth();
  await auth.signOut();
  redirect(localePath('/login', locale));
}
