'use client';

import { useId, useState, type ReactNode } from 'react';

/** Client-side tabs for the read-only demo (one URL, no login). */
export function DemoTabs({ panels }: { panels: Array<{ id: string; label: string; content: ReactNode }> }) {
  const [active, setActive] = useState(panels[0].id);
  const base = useId();
  return (
    <div>
      <div role="tablist" aria-label="أقسام لوحة التحكم" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {panels.map((p, i) => (
          <button
            key={p.id}
            id={`${base}-tab-${p.id}`}
            role="tab"
            type="button"
            aria-selected={active === p.id}
            aria-controls={`${base}-panel-${p.id}`}
            tabIndex={active === p.id ? 0 : -1}
            onClick={() => setActive(p.id)}
            onKeyDown={(e) => {
              // Arrow keys follow reading direction: in RTL, ArrowLeft moves forward.
              const rtl = document.documentElement.dir === 'rtl';
              const step = e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : e.key === 'ArrowRight' ? (rtl ? -1 : 1) : 0;
              if (!step) return;
              const next = panels[(i + step + panels.length) % panels.length];
              setActive(next.id);
              document.getElementById(`${base}-tab-${next.id}`)?.focus();
            }}
            className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-medium ${
              active === p.id ? 'border-ember text-text' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {panels.map((p) => (
        <div key={p.id} id={`${base}-panel-${p.id}`} role="tabpanel" aria-labelledby={`${base}-tab-${p.id}`} hidden={active !== p.id}>
          {p.content}
        </div>
      ))}
    </div>
  );
}
