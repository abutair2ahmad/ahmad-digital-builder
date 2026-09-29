'use client';

/**
 * Demo only: "try ordering as if we're open". A per-tab flag in
 * sessionStorage. The server honours it only in demo mode.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'jamra.demo.open';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setDemoOpen(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(KEY, '1');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: the flag simply doesn't stick
  }
  listeners.forEach((l) => l());
}

export function useDemoOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => false,
  );
}
