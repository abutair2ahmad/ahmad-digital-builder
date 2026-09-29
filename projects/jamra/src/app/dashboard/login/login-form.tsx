'use client';

import { useActionState } from 'react';
import { signIn } from '@/lib/dashboard/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-5 grid gap-4">
      <label className="grid gap-1">
        <span className="label">الإيميل</span>
        <input name="email" type="email" dir="ltr" autoComplete="email" required className="field text-start" />
      </label>
      <label className="grid gap-1">
        <span className="label">كلمة السر</span>
        <input name="password" type="password" dir="ltr" autoComplete="current-password" required className="field text-start" />
      </label>
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? 'لحظة...' : 'دخول'}</button>
    </form>
  );
}
