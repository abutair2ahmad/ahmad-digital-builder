import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({ label, value, hint, icon, className }: { label: string; value: string; hint?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
