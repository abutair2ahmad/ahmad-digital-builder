'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  /** 'sheet': bottom sheet on mobile, centered dialog from 768px. 'drawer': full sheet on mobile, side panel from 768px. */
  variant: 'sheet' | 'drawer';
}

/**
 * Native <dialog> opened with showModal(): the rest of the page is inert (focus
 * stays inside), Esc closes it, and focus returns to whatever opened it.
 */
export function Dialog({ labelledBy, onClose, children, variant }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      opener?.focus?.();
    };
  }, []);

  const layout =
    variant === 'sheet'
      ? 'mt-auto mb-0 w-full max-w-none rounded-t-[24px] md:m-auto md:max-w-lg md:rounded-[24px] max-h-[92dvh]'
      : 'm-0 w-full max-w-none h-dvh max-h-dvh md:ms-auto md:max-w-md md:border-y-0 md:border-e-0';

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={`animate-sheet-up overflow-hidden border border-border bg-surface p-0 text-text backdrop:bg-black/60 ${layout}`}
    >
      <div className="flex max-h-[inherit] h-full flex-col">{children}</div>
    </dialog>
  );
}
