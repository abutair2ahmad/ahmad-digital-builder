'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? 'Sign in failed. Please try again.');
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-10">
      <label htmlFor="password" className="eyebrow block">
        Clinic password
      </label>
      <input
        id="password"
        type="password"
        value={password}
        autoComplete="current-password"
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'password-error' : undefined}
        className={`mt-3 w-full border-b bg-transparent pb-3 text-[0.95rem] text-ink outline-none transition-colors ${
          error ? 'border-aurum' : 'border-shell/70 focus:border-ink'
        }`}
      />
      {error && (
        <p id="password-error" role="alert" className="mt-3 text-[0.8125rem] text-aurum">
          {error}
        </p>
      )}

      <div className="mt-8">
        <Button type="submit" disabled={busy || !password} arrow={!busy}>
          {busy ? 'Checking…' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}
