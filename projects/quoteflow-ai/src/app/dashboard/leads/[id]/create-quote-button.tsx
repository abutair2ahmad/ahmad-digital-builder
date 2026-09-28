'use client';

import { useTransition } from 'react';
import { FilePlus2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/client';
import { createQuoteFromLeadAction } from '../actions';

export function CreateQuoteButton({ leadId, hasQuotes }: { leadId: string; hasQuotes: boolean }) {
  const { dict: d } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      variant={hasQuotes ? 'outline' : 'default'}
      onClick={() =>
        start(async () => {
          const r = await createQuoteFromLeadAction(leadId);
          if (r && !r.ok) toast.error(r.error ?? d.leads.couldNotCreateQuote);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
      {hasQuotes ? d.leads.requote : d.leads.createQuote}
    </Button>
  );
}
