'use client';

import { useEffect, useState } from 'react';
import type { Slot } from '@/lib/booking/availability';

interface Settled<T> {
  key: string;
  value: T | 'error';
}

/**
 * Availability fetching, shared by the booking flow, the patient management
 * page and the clinic dashboard — so all three read exactly the same truth.
 *
 * State is stored against the request key and only ever written from inside the
 * async callback. Loading is derived by comparing the settled key with the
 * current one, which avoids a synchronous setState during the effect.
 */
export function useDaySlots(treatmentId: string | null, doctorId: string | null, date: string | null) {
  const key = `${treatmentId}|${doctorId}|${date}`;
  const [settled, setSettled] = useState<Settled<{ slots: Slot[]; reason?: string }> | null>(null);

  useEffect(() => {
    if (!treatmentId || !doctorId || !date) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ treatmentId, doctorId, date });

    fetch(`/api/availability?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('unavailable'))))
      .then((payload: { slots: Slot[]; reason?: string }) =>
        setSettled({ key, value: { slots: payload.slots ?? [], reason: payload.reason } }),
      )
      .catch((error) => {
        if (error?.name !== 'AbortError') setSettled({ key, value: 'error' });
      });

    return () => controller.abort();
  }, [key, treatmentId, doctorId, date]);

  const current = settled?.key === key ? settled.value : null;

  return {
    loading: current === null,
    failed: current === 'error',
    slots: current && current !== 'error' ? current.slots : [],
    reason: current && current !== 'error' ? current.reason : undefined,
    available: current && current !== 'error' ? current.slots.filter((slot) => slot.available) : [],
  };
}

/** Free-slot counts per day, used to light up the calendar grid. */
export function useOpenDays(
  treatmentId: string | null,
  doctorId: string | null,
  from: string,
  days: number,
) {
  const key = `${treatmentId}|${doctorId}|${from}|${days}`;
  const [settled, setSettled] = useState<Settled<Record<string, number>> | null>(null);

  useEffect(() => {
    if (!treatmentId || !doctorId) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      treatmentId,
      doctorId,
      from,
      days: String(days),
    });

    fetch(`/api/availability?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('unavailable'))))
      .then((payload: { counts: Record<string, number> }) => setSettled({ key, value: payload.counts ?? {} }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setSettled({ key, value: 'error' });
      });

    return () => controller.abort();
  }, [key, treatmentId, doctorId, from, days]);

  const current = settled?.key === key ? settled.value : null;

  return {
    loading: current === null,
    failed: current === 'error',
    counts: current && current !== 'error' ? current : {},
  };
}
