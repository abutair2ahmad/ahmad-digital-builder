'use client';

import { Clock } from 'lucide-react';
import { useSite } from '@/components/providers';
import { useOrdering } from '@/lib/client/ordering';
import { interpolate } from '@/lib/i18n/format';

/** Header chip. Fixed min-width so the header doesn't shift when it resolves. */
export function OpenStatus() {
  const { dict } = useSite();
  const { status } = useOrdering();

  let text = ' ';
  let tone = 'text-muted';
  if (status?.open) {
    text = interpolate(dict.status.open, { time: status.closesAt });
    tone = 'text-success';
  } else if (status) {
    text = dict.status.closedShort;
    tone = 'text-danger';
  }

  return (
    <span className={`inline-flex min-w-[8.5rem] items-center gap-1.5 text-xs font-medium ${tone}`} aria-live="polite">
      <Clock className="size-3.5 shrink-0" aria-hidden />
      <span className="tabular truncate">{text}</span>
    </span>
  );
}
