'use client';

import { useState, useTransition } from 'react';
import { Toggle } from '@/components/dashboard/ui';
import { updateZone } from '@/lib/dashboard/actions';
import type { DeliveryZone } from '@/lib/types';

function ZoneRow({ zone, readOnly }: { zone: DeliveryZone; readOnly: boolean }) {
  const [form, setForm] = useState({ fee: String(zone.fee), eta_minutes: String(zone.eta_minutes), min_order: String(zone.min_order), active: zone.active });
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, start] = useTransition();

  const submit = () => {
    setMessage(undefined);
    start(async () => {
      const r = await updateZone({
        id: zone.id,
        fee: Number(form.fee),
        eta_minutes: Number(form.eta_minutes),
        min_order: Number(form.min_order),
        active: form.active,
      });
      setMessage(r.ok ? { ok: true, text: 'انحفظ' } : { ok: false, text: r.error });
    });
  };

  const input = (key: 'fee' | 'eta_minutes' | 'min_order', label: string) => (
    <label className="grid gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        dir="ltr"
        min={0}
        value={form[key]}
        disabled={readOnly || pending}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="field tabular min-h-11 w-28 py-1 text-start"
      />
    </label>
  );

  return (
    <li className="card flex flex-wrap items-end gap-4 p-4">
      <p className="min-w-32 flex-1 self-center font-bold">{zone.name.ar}</p>
      {input('fee', 'رسوم التوصيل ₪')}
      {input('eta_minutes', 'وقت التوصيل (دقيقة)')}
      {input('min_order', 'الحد الأدنى ₪')}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <span className="text-muted">فعّالة</span>
        <Toggle checked={form.active} disabled={readOnly || pending} label={`منطقة فعّالة: ${zone.name.ar}`} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
      </label>
      <button type="button" onClick={submit} disabled={readOnly || pending} className="btn btn-secondary">حفظ</button>
      {message && <p className={`w-full text-sm ${message.ok ? 'text-success' : 'text-danger'}`} role="status">{message.text}</p>}
    </li>
  );
}

export function ZonesManager({ zones, readOnly = false }: { zones: DeliveryZone[]; readOnly?: boolean }) {
  return (
    <ul className="grid gap-3">
      {[...zones].sort((a, b) => a.sort_order - b.sort_order).map((z) => (
        <ZoneRow key={z.id} zone={z} readOnly={readOnly} />
      ))}
    </ul>
  );
}
