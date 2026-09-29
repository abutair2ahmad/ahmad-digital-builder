'use client';

/**
 * Cart as an external store over localStorage. Read with useSyncExternalStore
 * so the server/hydration render is always the empty cart (no mismatch), and
 * the saved cart appears right after hydration.
 */
import { useSyncExternalStore } from 'react';
import type { Fulfillment, OptionSelection } from '@/lib/types';

export interface CartLine {
  key: string;
  item_id: string;
  qty: number;
  options: OptionSelection;
}

export interface Removal {
  item_id: string;
  reason: 'sold_out' | 'unavailable';
}

/** Why an add/increase was refused (same limits as place_order). */
export type CartLimit = 'lines' | 'total' | 'line';

export interface CartState {
  lines: CartLine[];
  fulfillment: Fulfillment;
  zone_id: string | null;
  /** Lines removed because the menu changed; shown once, never persisted. */
  removed: Removal[];
  /** Last limit hit, shown briefly; never persisted. */
  limit: CartLimit | null;
}

const KEY = 'jamra.cart.v1';
export const CART_LIMITS = { maxQtyPerLine: 20, maxLines: 30, maxTotalQty: 50 } as const;
const MAX_QTY = CART_LIMITS.maxQtyPerLine;
const EMPTY: CartState = { lines: [], fulfillment: 'delivery', zone_id: null, removed: [], limit: null };
let limitTimer: ReturnType<typeof setTimeout> | null = null;

let state: CartState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): CartState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      lines: Array.isArray(parsed.lines)
        ? parsed.lines.filter((l): l is CartLine => typeof l?.item_id === 'string' && Number.isInteger(l.qty) && l.qty > 0)
        : [],
      fulfillment: parsed.fulfillment === 'pickup' ? 'pickup' : 'delivery',
      zone_id: typeof parsed.zone_id === 'string' ? parsed.zone_id : null,
      removed: [],
      limit: null,
    };
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  state = readStorage();
}

function commit(next: CartState) {
  state = next;
  try {
    const { removed: _removed, limit: _limit, ...persisted } = next;
    void _removed;
    void _limit;
    window.localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    // Private mode / quota: the cart still works for this page view.
  }
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== KEY) return;
  state = { ...readStorage(), removed: state.removed, limit: state.limit };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  if (listeners.size === 1) window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function lineKey(itemId: string, options: OptionSelection): string {
  const sorted = Object.keys(options)
    .sort()
    .map((k) => [k, Array.isArray(options[k]) ? [...(options[k] as string[])].sort() : options[k]]);
  return `${itemId}|${JSON.stringify(sorted)}`;
}

const totalQty = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);

/** Show a limit message for a few seconds. */
function flagLimit(limit: CartLimit) {
  ensureLoaded();
  commit({ ...state, limit });
  if (limitTimer) clearTimeout(limitTimer);
  limitTimer = setTimeout(() => {
    limitTimer = null;
    if (state.limit) commit({ ...state, limit: null });
  }, 4000);
}

export const cart = {
  /** Adds as much as the limits allow; returns the limit hit, if any. */
  add(itemId: string, options: OptionSelection = {}, qty = 1): CartLimit | null {
    ensureLoaded();
    const key = lineKey(itemId, options);
    const existing = state.lines.find((l) => l.key === key);
    if (!existing && state.lines.length >= CART_LIMITS.maxLines) {
      flagLimit('lines');
      return 'lines';
    }
    const current = existing?.qty ?? 0;
    const room = CART_LIMITS.maxTotalQty - totalQty(state.lines);
    const allowed = Math.min(qty, room, MAX_QTY - current);
    const limit: CartLimit | null = allowed < qty ? (room < MAX_QTY - current ? 'total' : 'line') : null;
    if (allowed > 0) {
      const lines = existing
        ? state.lines.map((l) => (l.key === key ? { ...l, qty: current + allowed } : l))
        : [...state.lines, { key, item_id: itemId, qty: allowed, options }];
      commit({ ...state, lines });
    }
    if (limit) flagLimit(limit);
    return limit;
  },
  setQty(key: string, qty: number): CartLimit | null {
    ensureLoaded();
    const line = state.lines.find((l) => l.key === key);
    if (!line) return null;
    if (qty <= 0) {
      commit({ ...state, lines: state.lines.filter((l) => l.key !== key) });
      return null;
    }
    if (qty > line.qty) return cart.add(line.item_id, line.options, qty - line.qty);
    commit({ ...state, lines: state.lines.map((l) => (l.key === key ? { ...l, qty } : l)) });
    return null;
  },
  remove(key: string) {
    cart.setQty(key, 0);
  },
  /** Drop every line of these items and remember why, to tell the customer. */
  removeItems(removals: Removal[]) {
    ensureLoaded();
    const ids = new Set(removals.map((r) => r.item_id));
    if (!state.lines.some((l) => ids.has(l.item_id))) return;
    commit({
      ...state,
      lines: state.lines.filter((l) => !ids.has(l.item_id)),
      removed: [...state.removed.filter((r) => !ids.has(r.item_id)), ...removals],
    });
  },
  dismissRemoved() {
    ensureLoaded();
    if (state.removed.length) commit({ ...state, removed: [] });
  },
  setFulfillment(fulfillment: Fulfillment) {
    ensureLoaded();
    commit({ ...state, fulfillment });
  },
  setZone(zoneId: string | null) {
    ensureLoaded();
    commit({ ...state, zone_id: zoneId });
  },
  clear() {
    ensureLoaded();
    commit({ ...EMPTY, fulfillment: state.fulfillment, zone_id: state.zone_id });
  },
  /** For the item sheet's own stepper: note a limit without changing the cart. */
  flagLimit,
};
