'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** false on the server and during hydration, true after. No effect, no mismatch. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

// A shared minute clock: one interval for every subscriber.
const minuteListeners = new Set<() => void>();
let minuteTimer: ReturnType<typeof setInterval> | null = null;

function subscribeMinute(cb: () => void) {
  minuteListeners.add(cb);
  if (!minuteTimer) minuteTimer = setInterval(() => minuteListeners.forEach((l) => l()), 30_000);
  return () => {
    minuteListeners.delete(cb);
    if (!minuteListeners.size && minuteTimer) {
      clearInterval(minuteTimer);
      minuteTimer = null;
    }
  };
}

/**
 * Current minute as epoch ms, or null on the server. Pages are static, so
 * anything time-based (open/closed) is decided in the browser.
 */
export function useNowMinute(): number | null {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  );
}
