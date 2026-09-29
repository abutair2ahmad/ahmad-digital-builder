import Link from 'next/link';
import type { ReactNode } from 'react';
import { ExternalLink, LogOut } from 'lucide-react';
import { DemoBadge } from '@/components/dashboard/ui';
import { signOut } from '@/lib/dashboard/actions';

const NAV = [
  { key: 'orders', href: '/dashboard/orders', label: 'الطلبات' },
  { key: 'menu', href: '/dashboard/menu', label: 'المنيو' },
  { key: 'zones', href: '/dashboard/zones', label: 'مناطق التوصيل' },
  { key: 'settings', href: '/dashboard/settings', label: 'الإعدادات' },
] as const;

export type DashboardSection = (typeof NAV)[number]['key'];

/** Frame for every dashboard screen. The demo passes no `active` and shows its own tabs. */
export function DashboardShell({ active, demo = false, children }: { active?: DashboardSection; demo?: boolean; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <p className="flex items-center gap-2 font-bold">
            <span aria-hidden className="size-2.5 rounded-full bg-ember" />
            جمرة · لوحة التحكم
          </p>
          {demo && <DemoBadge />}
          <div className="ms-auto flex items-center gap-1">
            <Link href="/ar" className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm text-muted hover:text-text">
              الموقع
              <ExternalLink className="size-4" aria-hidden />
            </Link>
            {!demo && (
              <form action={signOut}>
                <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm text-muted hover:text-text">
                  خروج
                  <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
                </button>
              </form>
            )}
          </div>
        </div>
        {active && (
          <nav aria-label="أقسام لوحة التحكم" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={n.key === active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium ${
                  n.key === active ? 'border-ember text-text' : 'border-transparent text-muted hover:text-text'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
