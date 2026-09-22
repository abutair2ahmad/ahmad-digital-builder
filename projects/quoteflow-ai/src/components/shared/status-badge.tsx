import { Badge } from '@/components/ui/badge';
import { LEAD_STATUS_LABEL, QUOTE_STATUS_LABEL } from '@/lib/format';
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
  return (
    <Badge variant="outline" className={cn('font-medium', tone[status], className)}>
      {LEAD_STATUS_LABEL[status]}
    </Badge>
  );
}

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', tone[status], className)}>
      {QUOTE_STATUS_LABEL[status]}
    </Badge>
  );
}
