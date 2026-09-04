import { AnimatePresence, motion } from 'motion/react';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'default' | 'warn';
  action?: { label: string; onClick: () => void };
}

export function Toasts({ items, onDismiss }: { items: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-porcelain/10 bg-ink-900 px-4 py-3 text-porcelain shadow-2xl"
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${t.tone === 'warn' ? 'bg-copper-400' : 'bg-jade-300'}`}
            />
            <p className="flex-1 text-[13px]">{t.text}</p>
            {t.action ? (
              <button
                onClick={() => {
                  t.action!.onClick();
                  onDismiss(t.id);
                }}
                className="shrink-0 text-[12.5px] font-medium text-jade-300 underline underline-offset-4"
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-jade-100/40 transition-colors hover:text-porcelain"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
