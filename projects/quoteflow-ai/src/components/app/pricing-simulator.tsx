'use client';

import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import { fill } from '@/lib/i18n';
import { availableOptions, calculatePrice } from '@/lib/pricing/engine';
import type { PricingRule, Service } from '@/lib/types';

/**
 * Runs the real pricing engine in the browser so a business owner can see
 * exactly what a customer would be quoted, as they edit rules.
 */
export function PricingSimulator({ services, rules, currency }: { services: Service[]; rules: PricingRule[]; currency: string }) {
  const { dict: d, locale } = useI18n();
  const active = services.filter((s) => s.active);
  const [serviceId, setServiceId] = useState(active[0]?.id ?? '');
  const [quantity, setQuantity] = useState('50');
  const [location, setLocation] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const service = services.find((s) => s.id === serviceId) ?? null;
  const opts = useMemo(() => (service ? availableOptions(rules, service.id) : []), [rules, service]);

  const result = useMemo(() => {
    if (!service) return null;
    return calculatePrice(
      { service, quantity: service.pricing_type === 'per_unit' ? Number(quantity) || 0 : 1, location: location || null, urgency: urgent ? 'urgent' : 'standard', options },
      rules.filter((r) => r.active),
    );
  }, [service, quantity, location, urgent, options, rules]);

  if (!active.length) return null;

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <Calculator className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{d.pricing.simulator}</h2>
        <span className="ms-auto text-xs text-muted-foreground">{d.pricing.simulatorHint}</span>
      </div>
      <div className="grid gap-5 p-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{d.leads.service}</Label>
            <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setOptions([]); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {active.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {service?.pricing_type === 'per_unit' ? (
            <div className="space-y-1.5">
              <Label htmlFor="sim-qty">{fill(d.pricing.quantityWithUnit, { unit: service.unit ?? d.agent.units })}</Label>
              <Input id="sim-qty" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="sim-location">{d.leads.location}</Label>
            <Input id="sim-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={d.common.locationExample} />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label htmlFor="sim-urgent" className="font-normal">
              {d.pricing.urgentJob}
            </Label>
            <Switch id="sim-urgent" checked={urgent} onCheckedChange={setUrgent} />
          </div>
          {opts.length ? (
            <div className="space-y-2">
              <Label>{d.pricing.optionalExtras}</Label>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => {
                  const on = options.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setOptions((prev) => (on ? prev.filter((v) => v !== o.value) : [...prev, o.value]))}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? 'border-accent-strong bg-accent-soft text-accent-strong' : 'hover:bg-accent'}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div className="rounded-lg border bg-background p-4">
          {result ? (
            <>
              <ul className="space-y-2 text-sm">
                {result.lines.map((l, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <p>{l.label}</p>
                      {l.description ? <p className="text-xs text-muted-foreground">{l.description}</p> : null}
                    </div>
                    <span className="shrink-0 tabular">{formatMoney(l.amount, currency, locale)}</span>
                  </li>
                ))}
              </ul>
              {result.warnings.map((w) => (
                <p key={w} className="mt-3 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
                  {w}
                </p>
              ))}
              <div className="mt-4 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>{d.quotes.subtotal}</span>
                  <span className="tabular">{formatMoney(result.subtotal, currency, locale)}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>{d.pricing.modifiersLabel}</span>
                  <span className="tabular">{formatMoney(result.modifiers_total, currency, locale)}</span>
                </div>
                <div className="flex justify-between gap-3 text-base font-semibold">
                  <span>{d.pricing.estimateLabel}</span>
                  <span className="tabular">{formatMoney(result.total, currency, locale)}</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
