'use client';

import { useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { useSite } from '@/components/providers';
import { disclosureText, hasDishPhotos } from '@/lib/i18n/disclosure';

const KEY = 'jamra.disclosure.dismissed';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Thin top bar on every page: concept brand, no food, AI photos. Dismissal
 * lasts for the browsing session only, so every new visit sees it again.
 */
export function DisclosureBar() {
  const { dict, menu } = useSite();
  const dismissed = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => false,
  );
  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(KEY, '1');
    } catch {
      // ignore
    }
    listeners.forEach((l) => l());
  };

  return (
    <div role="note" aria-label={dict.disclosure.label} className="bg-elevated border-b border-border text-muted text-xs">
      <div className="mx-auto flex max-w-6xl items-center gap-2 ps-4 pe-1">
        <p className="flex-1 py-1.5">{disclosureText(dict, hasDishPhotos(menu.items))}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={dict.disclosure.dismiss}
          className="grid size-11 shrink-0 place-items-center rounded-md hover:text-text"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
