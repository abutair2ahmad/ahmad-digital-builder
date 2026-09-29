'use client';

import { useSite } from '@/components/providers';
import { useDemoOpen } from '@/lib/client/demo-open';
import { useNowMinute } from '@/lib/client/hooks';
import { interpolate } from '@/lib/i18n/format';
import { DAY_NAMES_LONG } from '@/lib/i18n/hours-text';
import { openStatus, type OpenStatus } from '@/lib/order/hours';

export interface OrderingState {
  /** null until the browser knows the time (server render / hydration). */
  status: OpenStatus | null;
  canOrder: boolean;
  /** Why ordering is off, in the visitor's language; null when it's on. */
  reason: string | null;
  /** Demo mode, restaurant closed: the visitor may switch on "as if open". */
  demoCanOverride: boolean;
  /** The demo "as if open" flag is on (only ever true in demo mode). */
  demoOpen: boolean;
  /** Closed or paused, but the demo flag lets the visitor order anyway. */
  demoOverriding: boolean;
}

export function useOrdering(): OrderingState {
  const { menu, dict, demo, locale } = useSite();
  const now = useNowMinute();
  const flag = useDemoOpen();
  const demoOpen = demo && flag;

  // Optimistic until the clock is known; the server re-checks on submit anyway.
  if (now === null) return { status: null, canOrder: true, reason: null, demoCanOverride: false, demoOpen, demoOverriding: false };

  const status = openStatus(menu.settings.opening_hours, new Date(now));
  let reason: string | null = null;
  if (!menu.settings.accepting_orders) reason = dict.status.notAccepting;
  else if (!status.open) {
    if (!status.opensAt) reason = dict.status.orderingDisabled;
    else if (status.opensInDays === 0) reason = interpolate(dict.status.closed, { time: status.opensAt });
    else if (status.opensInDays === 1) reason = interpolate(dict.status.closedTomorrow, { time: status.opensAt });
    else reason = interpolate(dict.status.closedOnDay, { time: status.opensAt, day: DAY_NAMES_LONG[locale][status.opensDow ?? 0] });
  }

  if (reason && demoOpen) return { status, canOrder: true, reason: null, demoCanOverride: false, demoOpen, demoOverriding: true };
  return { status, canOrder: !reason, reason, demoCanOverride: Boolean(reason) && demo, demoOpen, demoOverriding: false };
}
