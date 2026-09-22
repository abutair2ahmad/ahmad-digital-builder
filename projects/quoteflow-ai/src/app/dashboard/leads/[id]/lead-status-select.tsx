'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUS_LABEL } from '@/lib/format';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/types';
import { setLeadStatusAction } from '../actions';

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [pending, start] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          const r = await setLeadStatusAction(leadId, v);
          if (r.ok) toast.success(`Lead marked ${LEAD_STATUS_LABEL[v as LeadStatus]}`);
          else toast.error(r.error ?? 'Could not update');
        })
      }
    >
      <SelectTrigger className="w-40" aria-label="Lead status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {LEAD_STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
