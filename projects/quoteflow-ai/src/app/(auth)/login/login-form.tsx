'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { useI18n } from '@/lib/i18n/client';
import { signInAction } from '../actions';

export function LoginForm({ next, demo }: { next?: string; demo: { email: string; password: string } | null }) {
  const { dict: d, href } = useI18n();
  const [state, action] = useFormAction(signInAction);
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{d.auth.welcomeBack}</h1>
        <p className="text-sm text-muted-foreground">{d.auth.signInSubtitle}</p>
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError error={state.error} />
      <Field label={d.auth.email} htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={demo?.email ?? ''} dir="ltr" />
      </Field>
      <Field label={d.auth.password} htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demo?.password ?? ''} dir="ltr" />
      </Field>
      <SubmitButton className="w-full" pendingText={d.auth.signingIn}>
        {d.common.signIn}
      </SubmitButton>
      {demo ? (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {d.auth.demoPrefilled} <span className="font-mono" dir="ltr">{demo.email}</span> / <span className="font-mono" dir="ltr">{demo.password}</span>
        </p>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        {d.auth.newHere}{' '}
        <Link href={href('/signup')} className="font-medium text-foreground underline-offset-4 hover:underline">
          {d.auth.createAnAccount}
        </Link>
      </p>
    </form>
  );
}
