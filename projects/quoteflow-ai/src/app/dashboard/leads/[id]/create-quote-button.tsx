'use client';

import { useTransition } from 'react';
import { FilePlus2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createQuoteFromLeadAction } from '../actions';

export function CreateQuoteButton({ leadId, hasQuotes }: { leadId: string; hasQuotes: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      variant={hasQuotes ? 'outline' : 'default'}
      onClick={() =>
        start(async () => {
          const r = await createQuoteFromLeadAction(leadId);
          if (r && !r.ok) toast.error(r.error ?? 'Could not create quote');
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
      {hasQuotes ? 'Re-quote with current rules' : 'Create quote'}
    </Button>
  );
}
