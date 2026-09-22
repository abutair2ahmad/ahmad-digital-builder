'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { decideQuoteAction } from './actions';

export function DecisionButtons({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const decide = (decision: 'accepted' | 'rejected') =>
    start(async () => {
      if (decision === 'rejected' && !window.confirm('Decline this quote? You can always contact us for a revised estimate.')) return;
      const r = await decideQuoteAction(token, decision);
      if (!r.ok) setError(r.error ?? 'Something went wrong.');
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending} onClick={() => decide('accepted')} style={{ backgroundColor: 'var(--brand)', color: 'var(--on-brand)' }}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} Accept quote
        </Button>
        <Button variant="outline" className="flex-1" disabled={pending} onClick={() => decide('rejected')}>
          <X /> Decline
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
