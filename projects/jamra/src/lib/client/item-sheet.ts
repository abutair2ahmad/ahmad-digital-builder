'use client';

/**
 * The item sheet lives in `?item=<slug>` (shallow, native history API, which
 * Next.js syncs with useSearchParams). Back closes it. A sheet opened from a
 * shared link has no entry of ours to pop, so closing replaces the URL.
 */
let pushedByUs = false;

export function openItemSheet(slug: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('item', slug);
  window.history.pushState(null, '', url.pathname + url.search + url.hash);
  pushedByUs = true;
}

export function closeItemSheet() {
  if (pushedByUs) {
    pushedByUs = false;
    window.history.back();
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('item');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

/** Back button already removed the param: forget our entry. */
export function sheetClosedByHistory() {
  pushedByUs = false;
}
