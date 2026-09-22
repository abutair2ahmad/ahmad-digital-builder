'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { Field, FormError, SubmitButton } from '@/components/shared/form';
import { signInAction } from '../actions';

export function LoginForm({ next, demo }: { next?: string; demo: { email: string; password: string } | null }) {
  const [state, action] = useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError error={state.error} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={demo?.email ?? ''} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demo?.password ?? ''} />
      </Field>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      {demo ? (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Demo workspace pre-filled: <span className="font-mono">{demo.email}</span> / <span className="font-mono">{demo.password}</span>
        </p>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
