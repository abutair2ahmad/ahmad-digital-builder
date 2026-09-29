import type { OrderStatus } from '@/lib/types';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'جديد — بانتظار التأكيد',
  confirmed: 'مؤكَّد',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'border border-ember text-ember',
  confirmed: 'bg-warn/15 text-warn',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-elevated text-muted',
};

export function StatusChip({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** 44×24 switch; on = success. */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-success' : 'bg-border-strong'
      }`}
    >
      <span className={`absolute size-5 rounded-full bg-text transition-[inset-inline-start] ${checked ? 'start-[22px]' : 'start-0.5'}`} />
    </button>
  );
}

export function DemoBadge() {
  return <span className="rounded-full border border-warn/50 bg-warn/10 px-3 py-1 text-xs font-medium text-warn">بيانات تجريبية</span>;
}

export const READ_ONLY_NOTE = 'هذه نسخة تجريبية للعرض فقط — التغييرات معطّلة.';

const dateFormat = new Intl.DateTimeFormat('ar-IL-u-nu-latn', {
  timeZone: 'Asia/Jerusalem',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Formatted on the server so client hydration never re-formats dates. */
export const formatOrderTime = (iso: string) => dateFormat.format(new Date(iso));
