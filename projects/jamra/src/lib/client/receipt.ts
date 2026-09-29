'use client';

/**
 * The last receipt lives in sessionStorage only: the confirmation page reads
 * it from there, so no order token or personal data ever goes into a URL.
 */
import { useSyncExternalStore } from 'react';
import type { Receipt } from '@/lib/types';

export interface StoredReceipt {
  receipt: Receipt;
  message: string;
  whatsappUrl: string;
  /** true until the confirmation page has sent the visitor to WhatsApp once. */
  pending: boolean;
}

const KEY = 'jamra.receipt.v1';
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveReceipt(value: StoredReceipt): boolean {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
    listeners.forEach((l) => l());
    return true;
  } catch {
    return false;
  }
}

/** Raw string snapshot (stable between reads); parse where it's used. */
export function useStoredReceiptRaw(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
}

export function parseStoredReceipt(raw: string | null): StoredReceipt | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as StoredReceipt;
    return v && v.receipt && typeof v.whatsappUrl === 'string' ? v : null;
  } catch {
    return null;
  }
}
