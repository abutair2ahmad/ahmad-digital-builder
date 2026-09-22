'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Download, Loader2, MessageCircle, Send, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { QuoteStatus } from '@/lib/types';
import { setQuoteStatusAction } from '../actions';

export function QuoteActions({ quoteId, status, publicUrl, customerPhone, customerName, companyName, total }: { quoteId: string; status: QuoteStatus; publicUrl: string; customerPhone: string | null; customerName: string | null; companyName: string; total: string }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const set = (next: QuoteStatus, label: string) =>
    start(async () => {
      const r = await setQuoteStatusAction(quoteId, next);
      if (r.ok) toast.success(label);
      else toast.error(r.error ?? 'Could not update');
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — select the link and copy it manually.');
    }
  };
  const waText = encodeURIComponent(`Hi${customerName ? ` ${customerName.split(' ')[0]}` : ''}, here is your estimate from ${companyName} (${total}): ${publicUrl}`);
  const waHref = `https://wa.me/${(customerPhone ?? '').replace(/[^\d]/g, '')}?text=${waText}`;
  const open = status === 'sent' || status === 'viewed';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' || status === 'expired' ? (
        <Button disabled={pending} onClick={() => set('sent', 'Quote marked as sent')}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />} {status === 'expired' ? 'Re-send' : 'Mark as sent'}
        </Button>
      ) : null}
      {open ? (
        <>
          <Button disabled={pending} onClick={() => set('accepted', 'Quote accepted — lead marked Won')}>
            <Check /> Accepted
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => set('rejected', 'Quote rejected — lead marked Lost')}>
            <X /> Rejected
          </Button>
        </>
      ) : null}
      {status === 'accepted' || status === 'rejected' ? (
        <Button variant="outline" disabled={pending} onClick={() => set('draft', 'Quote reopened as draft')}>
          <RotateCcw /> Reopen as draft
        </Button>
      ) : null}
      <Button variant="outline" asChild>
        <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noreferrer">
          <Download /> PDF
        </a>
      </Button>
      <Button variant="outline" onClick={copy}>
        {copied ? <Check /> : <Copy />} Copy link
      </Button>
      {customerPhone ? (
        <Button variant="outline" asChild>
          <a href={waHref} target="_blank" rel="noreferrer">
            <MessageCircle /> WhatsApp
          </a>
        </Button>
      ) : null}
    </div>
  );
}
