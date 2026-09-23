'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/client';
import type { LeadStatus, QuoteStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const tone: Record<string, string> = {
  new: 'bg-info-soft text-info border-transparent',
  qualified: 'bg-accent-soft text-accent-strong border-transparent',
  quote_sent: 'bg-warning-soft text-warning border-transparent',
  won: 'bg-success-soft text-success border-transparent',
  lost: 'bg-danger-soft text-destructive border-transparent',
  draft: 'bg-secondary text-muted-foreground border-transparent',
  sent: 'bg-info-soft text-info border-transparent',
  viewed: 'bg-accent-soft text-accent-strong border-transparent',
  accepted: 'bg-success-soft text-success border-transparent',
  rejected: 'bg-danger-soft text-destructive border-transparent',
  expired: 'bg-warning-soft text-warning border-transparent',
};

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const { dict } = useI18n();
  return (
    <Badge variant="outline" className={cn('font-medium', tone[status], className)}>
      {dict.status.lead[status]}
    </Badge>
  );
}

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  const { dict } = useI18n();
  return (
    <Badge variant="outline" className={cn('font-medium', tone[status], className)}>
      {dict.status.quote[status]}
    </Badge>
  );
}
