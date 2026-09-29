'use client';

import { useState, useTransition } from 'react';
import { StatusChip, STATUS_LABEL } from '@/components/dashboard/ui';
import { Price } from '@/components/ui/price';
import { setOrderStatus } from '@/lib/dashboard/actions';
import { formatLocalPhone } from '@/lib/order/phone';
import type { Order, OrderStatus } from '@/lib/types';

export type OrderRow = Order & { created_label: string };

const PAY: Record<Order['payment_method'], string> = { cash: 'كاش', card: 'بطاقة', bit: 'Bit' };
const STATUSES: OrderStatus[] = ['new', 'confirmed', 'delivered', 'cancelled'];

function StatusControl({ order, readOnly }: { order: OrderRow; readOnly: boolean }) {
  const [status, setStatus] = useState(order.status);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (readOnly) return <StatusChip status={status} />;
  return (
    <div className="grid gap-1">
      <select
        aria-label={`حالة الطلب #${order.order_number}`}
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as OrderStatus;
          const prev = status;
          setStatus(next);
          setError(undefined);
          start(async () => {
            const r = await setOrderStatus(order.id, next);
            if (!r.ok) {
              setStatus(prev);
              setError(r.error);
            }
          });
        }}
        className="field min-h-11 py-1 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

function Items({ order }: { order: OrderRow }) {
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer content-center text-accent">{order.items.reduce((s, l) => s + l.qty, 0)} أصناف</summary>
      <ul className="mt-1 grid gap-0.5 text-muted">
        {order.items.map((l, i) => (
          <li key={i}>
            <span className="tabular">{l.qty}×</span> {l.name.ar}
            {l.options.length > 0 && ` (${l.options.map((o) => o.label.ar).join('، ')})`}
          </li>
        ))}
        {order.notes && <li className="text-text">ملاحظات: {order.notes}</li>}
      </ul>
    </details>
  );
}

const where = (o: OrderRow) =>
  o.fulfillment === 'pickup' ? 'استلام من المطعم' : `${o.zone_name?.ar ?? ''} — ${o.address ?? ''}${o.landmark ? ` (${o.landmark})` : ''}`;

/** Table on wide screens, cards on phones. 52px rows, sticky header, tabular numbers. */
export function OrdersTable({ orders, readOnly = false }: { orders: OrderRow[]; readOnly?: boolean }) {
  if (!orders.length) return <p className="card p-8 text-center text-muted">ما في طلبات لسا.</p>;
  return (
    <>
      <div className="card hidden max-h-[70vh] overflow-auto md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-elevated text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-medium">رقم</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الوقت</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الزبون</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الاستلام</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الطلب</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الإجمالي</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => (
              <tr key={o.id} className="h-[52px] align-top">
                <td className="tabular px-4 py-3 font-bold">#{o.order_number}</td>
                <td className="tabular px-3 py-3 text-muted">{o.created_label}</td>
                <td className="px-3 py-3">
                  <p>{o.customer_name}</p>
                  <a href={`tel:${o.customer_phone}`} dir="ltr" className="tabular text-muted hover:text-text">{formatLocalPhone(o.customer_phone)}</a>
                </td>
                <td className="max-w-56 px-3 py-3 text-muted">{where(o)}</td>
                <td className="px-3 py-3"><Items order={o} /></td>
                <td className="px-3 py-3">
                  <Price amount={o.total} locale="ar" className="font-bold" />
                  <p className="text-xs text-muted">{PAY[o.payment_method]}</p>
                </td>
                <td className="w-52 px-4 py-3"><StatusControl order={o} readOnly={readOnly} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {orders.map((o) => (
          <li key={o.id} className="card grid gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="tabular font-bold">#{o.order_number}</p>
              <p className="tabular text-sm text-muted">{o.created_label}</p>
            </div>
            <p>
              {o.customer_name} ·{' '}
              <a href={`tel:${o.customer_phone}`} dir="ltr" className="tabular text-muted">{formatLocalPhone(o.customer_phone)}</a>
            </p>
            <p className="text-sm text-muted">{where(o)}</p>
            <Items order={o} />
            <div className="flex items-center justify-between gap-3">
              <p><Price amount={o.total} locale="ar" className="font-bold" /> <span className="text-xs text-muted">{PAY[o.payment_method]}</span></p>
              <div className="w-48"><StatusControl order={o} readOnly={readOnly} /></div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
