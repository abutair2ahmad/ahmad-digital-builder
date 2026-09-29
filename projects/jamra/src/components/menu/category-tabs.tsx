'use client';

import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/providers';

interface Tab {
  slug: string;
  name: string;
}

/**
 * Sticky, horizontally scrolling category tabs with a scrollspy. Plain
 * anchors, so they work before hydration and without JS.
 */
export function CategoryTabs({ tabs }: { tabs: Tab[] }) {
  const { dict } = useSite();
  const [active, setActive] = useState(tabs[0]?.slug);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(t.slug))
      .filter((el): el is HTMLElement => Boolean(el));
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        const first = tabs.find((t) => visible.has(t.slug));
        if (first) setActive(first.slug);
      },
      // The band just under the sticky header + tabs.
      { rootMargin: '-120px 0px -55% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [tabs]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  return (
    <nav aria-label={dict.nav.categories} className="sticky top-14 z-20 border-b border-border bg-bg/95 backdrop-blur">
      <ul ref={listRef} className="tabs-fade mx-auto flex max-w-6xl snap-x snap-mandatory gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {tabs.map((t) => (
          <li key={t.slug} className="snap-start">
            <a
              href={`#${t.slug}`}
              data-slug={t.slug}
              aria-current={active === t.slug ? 'true' : undefined}
              onClick={() => setActive(t.slug)}
              className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${
                active === t.slug ? 'bg-elevated text-text ring-1 ring-ember' : 'text-muted hover:text-text'
              }`}
            >
              {t.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
