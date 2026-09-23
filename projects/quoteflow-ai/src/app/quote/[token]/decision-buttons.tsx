'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { decideQuoteAction } from './actions';
import { useI18n } from '@/lib/i18n/client';

export function DecisionButtons({ token }: { token: string }) {
  const { dict: d } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const decide = (decision: 'accepted' | 'rejected') =>
    start(async () => {
      if (decision === 'rejected' && !window.confirm(d.quoteView.confirmDecline)) return;
      const r = await decideQuoteAction(token, decision);
      if (!r.ok) setError(r.error ?? d.widget.genericError);
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending} onClick={() => decide('accepted')} style={{ backgroundColor: 'var(--brand)', color: 'var(--on-brand)' }}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} {d.quoteView.acceptQuote}
        </Button>
        <Button variant="outline" className="flex-1" disabled={pending} onClick={() => decide('rejected')}>
          <X /> {d.quoteView.decline}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
