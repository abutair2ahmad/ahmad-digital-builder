import { Info } from 'lucide-react';
import { Price } from '@/components/ui/price';
import type { DashboardStats } from '@/lib/types';

/** Month numbers count confirmed + delivered orders only; "new" is shown as pending. */
export function StatsCards({ stats }: { stats: DashboardStats }) {
  const ratePct = Math.round(stats.commission_rate * 1000) / 10;
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <section className="card p-5 md:col-span-2" aria-labelledby="savings-label">
        <div className="flex items-start justify-between gap-3">
          <h2 id="savings-label" className="text-sm font-medium text-muted">
            العمولة التي كانت ستُدفع لو جاءت هذه الطلبات عبر تطبيق توصيل (تقدير)
          </h2>
          <span className="group relative">
            <button type="button" className="grid size-11 place-items-center -m-3 text-muted" aria-describedby="savings-info">
              <Info className="size-4" aria-hidden />
              <span className="sr-only">كيف انحسبت؟</span>
            </button>
            <span
              id="savings-info"
              role="tooltip"
              className="pointer-events-none absolute end-0 top-8 z-10 hidden w-64 rounded-[12px] border border-border bg-elevated p-3 text-xs text-muted group-focus-within:block group-hover:block"
            >
              {`مجموع أسعار الأكل للطلبات المؤكَّدة والمسلَّمة هذا الشهر × ${ratePct}% (النسبة من الإعدادات). تقدير فقط، مش فاتورة.`}
            </span>
          </span>
        </div>
        <Price amount={stats.wolt_savings_estimate} locale="ar" className="mt-2 block text-4xl font-bold text-success" />
        <p className="mt-1 text-sm text-muted">تقدير الشهر</p>
      </section>
      <section className="card p-5">
        <h2 className="text-sm font-medium text-muted">طلبات الشهر (مؤكَّدة ومسلَّمة)</h2>
        <p className="tabular mt-2 text-3xl font-bold">{stats.orders_count}</p>
        <p className="mt-1 text-sm text-muted">
          <span className="tabular">{stats.pending_count}</span> بانتظار التأكيد · <span className="tabular">{stats.cancelled_count}</span> ملغي
        </p>
      </section>
      <section className="card p-5">
        <h2 className="text-sm font-medium text-muted">مبيعات الشهر</h2>
        <Price amount={stats.revenue} locale="ar" className="mt-2 block text-3xl font-bold" />
        <p className="mt-1 text-sm text-muted">
          اليوم: <span className="tabular">{stats.today_count}</span> طلبات · <Price amount={stats.today_revenue} locale="ar" />
        </p>
      </section>
    </div>
  );
}
