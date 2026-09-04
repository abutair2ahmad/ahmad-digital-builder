import type { ReactNode } from 'react';

interface StepShellProps {
  index: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Consistent frame for every step, so only the content changes between them. */
export function StepShell({ index, title, description, children, footer }: StepShellProps) {
  return (
    <section aria-label={title}>
      <div className="flex items-baseline gap-4">
        <span className="tabular text-[0.6875rem] tracking-[0.24em] text-clay">{index}</span>
        <h2 className="display-md text-ink">{title}</h2>
      </div>
      {description && <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-clay">{description}</p>}
      <div className="mt-10">{children}</div>
      {footer && <div className="mt-10 flex flex-wrap items-center gap-4">{footer}</div>}
    </section>
  );
}

export function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="link-sweep text-[0.8125rem] uppercase tracking-[0.14em] text-clay transition-colors hover:text-ink"
    >
      ← {label}
    </button>
  );
}
