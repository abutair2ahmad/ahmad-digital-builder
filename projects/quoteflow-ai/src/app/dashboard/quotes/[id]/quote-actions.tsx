'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Download, Loader2, MessageCircle, Send, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { QuoteStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n/client';
import { fill } from '@/lib/i18n';
import { setQuoteStatusAction } from '../actions';

export function QuoteActions({ quoteId, status, publicUrl, customerPhone, customerName, companyName, total }: { quoteId: string; status: QuoteStatus; publicUrl: string; customerPhone: string | null; customerName: string | null; companyName: string; total: string }) {
  const { dict: d } = useI18n();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const set = (next: QuoteStatus, label: string) =>
    start(async () => {
      const r = await setQuoteStatusAction(quoteId, next);
      if (r.ok) toast.success(label);
      else toast.error(r.error ?? d.quotes.couldNotUpdate);
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success(d.quotes.linkCopied);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(d.quotes.copyFailed);
    }
  };
  const waText = encodeURIComponent(
    fill(d.quotes.whatsappMessage, {
      name: customerName ? ` ${customerName.split(' ')[0]}` : '',
      company: companyName,
      total,
      url: publicUrl,
    }),
  );
  const waHref = `https://wa.me/${(customerPhone ?? '').replace(/[^\d]/g, '')}?text=${waText}`;
  const open = status === 'sent' || status === 'viewed';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' || status === 'expired' ? (
        <Button disabled={pending} onClick={() => set('sent', d.quotes.markedSent)}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />} {status === 'expired' ? d.quotes.resend : d.quotes.markAsSent}
        </Button>
      ) : null}
      {open ? (
        <>
          <Button disabled={pending} onClick={() => set('accepted', d.quotes.markedAccepted)}>
            <Check /> {d.quotes.accepted}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => set('rejected', d.quotes.markedRejected)}>
            <X /> {d.quotes.rejected}
          </Button>
        </>
      ) : null}
      {status === 'accepted' || status === 'rejected' ? (
        <Button variant="outline" disabled={pending} onClick={() => set('draft', d.quotes.reopened)}>
          <RotateCcw /> {d.quotes.reopenAsDraft}
        </Button>
      ) : null}
      <Button variant="outline" asChild>
        <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noreferrer">
          <Download /> {d.quotes.pdf}
        </a>
      </Button>
      <Button variant="outline" onClick={copy}>
        {copied ? <Check /> : <Copy />} {d.quotes.copyLink}
      </Button>
      {customerPhone ? (
        <Button variant="outline" asChild>
          <a href={waHref} target="_blank" rel="noreferrer">
            <MessageCircle /> {d.quotes.whatsapp}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
