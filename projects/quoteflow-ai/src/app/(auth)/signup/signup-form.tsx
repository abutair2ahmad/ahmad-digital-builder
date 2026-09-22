'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field, FormError, SubmitButton } from '@/components/shared/form';
import { signUpAction } from '../actions';

export function SignupForm() {
  const [state, action] = useActionState(signUpAction, {});
  if (state.ok && state.stamp === -1) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheck className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">We sent a confirmation link to your email. Open it, then sign in to set up your company.</p>
        <Link href="/login" className="text-sm font-medium underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Set up your workspace in under two minutes.</p>
      </div>
      <FormError error={state.error} />
      <Field label="Your name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="Work email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password} hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
