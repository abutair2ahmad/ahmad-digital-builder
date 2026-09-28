'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n/client';
import { fill } from '@/lib/i18n';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/types';
import { setLeadStatusAction } from '../actions';

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const { dict: d } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          const r = await setLeadStatusAction(leadId, v);
          if (r.ok) toast.success(fill(d.leads.markedAs, { status: d.status.lead[v as LeadStatus] }));
          else toast.error(r.error ?? d.quotes.couldNotUpdate);
        })
      }
    >
      <SelectTrigger className="w-40" aria-label={d.leads.leadStatus}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {d.status.lead[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
