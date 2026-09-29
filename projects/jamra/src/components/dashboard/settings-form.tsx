'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Toggle } from '@/components/dashboard/ui';
import { updateSettings } from '@/lib/dashboard/actions';
import type { OpeningHours, Settings, Weekday } from '@/lib/types';

const DAYS: Array<[Weekday, string]> = [
  ['0', 'الأحد'], ['1', 'الإثنين'], ['2', 'الثلاثاء'], ['3', 'الأربعاء'], ['4', 'الخميس'], ['5', 'الجمعة'], ['6', 'السبت'],
];

type DayRow = { open: boolean; from: string; to: string };

/** One range per day in the form; "00:00" as closing time means midnight. */
function toRows(hours: OpeningHours): Record<Weekday, DayRow> {
  return Object.fromEntries(
    DAYS.map(([d]) => {
      const r = hours[d]?.[0];
      return [d, r ? { open: true, from: r[0], to: r[1] } : { open: false, from: '12:00', to: '23:00' }];
    }),
  ) as Record<Weekday, DayRow>;
}

export function SettingsForm({ settings, readOnly = false }: { settings: Settings; readOnly?: boolean }) {
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp_number);
  const [accepting, setAccepting] = useState(settings.accepting_orders);
  const [rate, setRate] = useState(String(Math.round(settings.commission_rate * 1000) / 10));
  const [pickupEta, setPickupEta] = useState(String(settings.pickup_eta_minutes));
  const [days, setDays] = useState(() => toRows(settings.opening_hours));
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, start] = useTransition();
  const disabled = readOnly || pending;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(undefined);
    const opening_hours: OpeningHours = {};
    for (const [d] of DAYS) if (days[d].open) opening_hours[d] = [[days[d].from, days[d].to]];
    start(async () => {
      const r = await updateSettings({
        whatsapp_number: whatsapp.replace(/\D/g, ''),
        accepting_orders: accepting,
        commission_rate: Number(rate) / 100,
        pickup_eta_minutes: Number(pickupEta),
        opening_hours,
      });
      setMessage(r.ok ? { ok: true, text: 'انحفظت الإعدادات' } : { ok: false, text: r.error });
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
      <section className="card grid gap-4 p-5" aria-labelledby="s-orders">
        <h2 id="s-orders" className="font-bold">الطلبات</h2>
        <div className="flex items-center justify-between gap-3">
          <span>استقبال الطلبات</span>
          <Toggle checked={accepting} onChange={setAccepting} disabled={disabled} label="استقبال الطلبات" />
        </div>
        <label className="grid gap-1">
          <span className="label">رقم واتساب المطعم (أرقام فقط، مثل 9725XXXXXXXX)</span>
          <input dir="ltr" inputMode="numeric" className="field tabular text-start" value={whatsapp} disabled={disabled} onChange={(e) => setWhatsapp(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="label">وقت تجهيز الاستلام (دقيقة)</span>
          <input type="number" dir="ltr" min={5} max={240} className="field tabular text-start" value={pickupEta} disabled={disabled} onChange={(e) => setPickupEta(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="label">نسبة عمولة التطبيقات للمقارنة (%)</span>
          <input type="number" dir="ltr" min={0} max={99.9} step={0.5} className="field tabular text-start" value={rate} disabled={disabled} onChange={(e) => setRate(e.target.value)} />
          <span className="text-xs text-muted">تُستخدم لتقدير العمولة في صفحة الطلبات فقط.</span>
        </label>
      </section>

      <section className="card grid gap-3 p-5" aria-labelledby="s-hours">
        <h2 id="s-hours" className="font-bold">ساعات العمل (توقيت القدس)</h2>
        {DAYS.map(([d, name]) => (
          <div key={d} className="flex flex-wrap items-center gap-3">
            <span className="w-20">{name}</span>
            <Toggle checked={days[d].open} disabled={disabled} label={`مفتوح يوم ${name}`} onChange={(v) => setDays((s) => ({ ...s, [d]: { ...s[d], open: v } }))} />
            <input type="time" dir="ltr" aria-label={`${name} من`} className="field tabular min-h-11 w-28 py-1" value={days[d].from} disabled={disabled || !days[d].open} onChange={(e) => setDays((s) => ({ ...s, [d]: { ...s[d], from: e.target.value } }))} />
            <span className="text-muted">–</span>
            <input type="time" dir="ltr" aria-label={`${name} لحد`} className="field tabular min-h-11 w-28 py-1" value={days[d].to} disabled={disabled || !days[d].open} onChange={(e) => setDays((s) => ({ ...s, [d]: { ...s[d], to: e.target.value } }))} />
          </div>
        ))}
        <p className="text-xs text-muted">وقت إغلاق أصغر من وقت الفتح يعني بعد نص الليل (مثلاً 12:00–00:00).</p>
      </section>

      <div className="flex items-center gap-3 lg:col-span-2">
        <button type="submit" disabled={disabled} className="btn btn-primary">حفظ الإعدادات</button>
        {message && <p className={message.ok ? 'text-success' : 'text-danger'} role="status">{message.text}</p>}
      </div>
    </form>
  );
}
