'use client';

import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { useI18n } from '@/lib/i18n/client';
import { signUpAction } from '../actions';

export function SignupForm() {
  const { dict: d, href } = useI18n();
  const [state, action] = useFormAction(signUpAction);
  if (state.ok && state.stamp === -1) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
          <MailCheck className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{d.auth.checkInbox}</h1>
        <p className="text-sm text-muted-foreground">{d.auth.checkInboxBody}</p>
        <Link href={href('/login')} className="text-sm font-medium underline-offset-4 hover:underline">
          {d.auth.backToSignIn}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{d.auth.createYourAccount}</h1>
        <p className="text-sm text-muted-foreground">{d.auth.signUpSubtitle}</p>
      </div>
      <FormError error={state.error} />
      <Field label={d.auth.yourName} htmlFor="fullName" error={state.fieldErrors?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label={d.auth.workEmail} htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" />
      </Field>
      <Field label={d.auth.password} htmlFor="password" error={state.fieldErrors?.password} hint={d.auth.passwordHint}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} dir="ltr" />
      </Field>
      <SubmitButton className="w-full" pendingText={d.auth.creatingAccount}>
        {d.auth.createAccount}
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {d.auth.alreadyHaveAccount}{' '}
        <Link href={href('/login')} className="font-medium text-foreground underline-offset-4 hover:underline">
          {d.common.signIn}
        </Link>
      </p>
    </form>
  );
}
