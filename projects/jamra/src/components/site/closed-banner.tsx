'use client';

import { Clock, FlaskConical } from 'lucide-react';
import { useSite } from '@/components/providers';
import { setDemoOpen } from '@/lib/client/demo-open';
import { useOrdering } from '@/lib/client/ordering';

/**
 * "مسكّرين هلأ — منفتح الساعة 12:00": browsing stays open, ordering doesn't.
 * In demo mode the visitor can try the full flow as if the restaurant were open.
 */
export function ClosedBanner() {
  const { dict } = useSite();
  const { canOrder, reason, demoCanOverride, demoOverriding } = useOrdering();
  const visible = (!canOrder && reason) || demoCanOverride || demoOverriding;

  return (
    <div className={visible ? 'mt-5 flex flex-wrap items-center gap-2' : ''}>
      <p id="ordering-status" role="status" className={canOrder || !reason ? 'sr-only' : 'inline-flex items-center gap-2 rounded-full border border-warn/40 bg-warn/10 px-4 py-2 text-sm'}>
        {!canOrder && reason && (
          <>
            <Clock className="size-4 text-warn" aria-hidden />
            {reason}
          </>
        )}
      </p>
      {demoCanOverride && (
        <button type="button" onClick={() => setDemoOpen(true)} className="btn btn-secondary min-h-11 text-sm">
          <FlaskConical className="size-4" aria-hidden />
          {dict.status.demoTry}
        </button>
      )}
      {demoOverriding && (
        <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-sm text-accent">
          <FlaskConical className="size-4" aria-hidden />
          {dict.status.demoOpenActive}
        </p>
      )}
    </div>
  );
}
