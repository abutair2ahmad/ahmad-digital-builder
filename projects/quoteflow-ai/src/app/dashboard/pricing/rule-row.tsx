'use client';

import { useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/lib/format';
import { fill, type Dictionary, type Locale } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/client';
import type { PricingRule, Service } from '@/lib/types';
import { deleteRuleAction, toggleRuleAction } from './actions';
import { RuleDialog } from './rule-dialog';

export function describeRule(rule: PricingRule, currency: string, d: Dictionary, locale: Locale): string {
  const amount = rule.rule_type === 'percentage' ? `${rule.amount > 0 ? '+' : ''}${rule.amount}%` : formatMoney(rule.amount, currency, locale);
  const t = d.pricing.describe;
  switch (rule.rule_type) {
    case 'fixed':
      return fill(t.fixed, { amount });
    case 'per_unit':
      return fill(t.per_unit, { amount });
    case 'minimum':
      return fill(t.minimum, { amount });
    case 'location_surcharge':
      return fill(t.location_surcharge, { amount, value: rule.condition_value ?? '' });
    case 'addon':
      return fill(t.addon, { amount, perUnit: rule.per_unit ? t.addonPerUnit : '', value: rule.condition_value ?? '' });
    case 'percentage': {
      if (!rule.condition_key) return fill(t.percentageAlways, { amount });
      const value = rule.condition_value ?? '';
      const condition =
        rule.condition_key === 'urgency'
          ? fill(t.condUrgency, { value: d.status.urgency[value === 'urgent' ? 'urgent' : 'standard'] })
          : rule.condition_key === 'option'
            ? fill(t.condOption, { value })
            : fill(t.condLocation, { value });
      return fill(t.percentageWhen, { amount, condition });
    }
  }
}

export function RuleRow({ rule, services, currency }: { rule: PricingRule; services: Service[]; currency: string }) {
  const { dict: d, locale } = useI18n();
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{rule.name}</p>
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{d.ruleType[rule.rule_type]}</span>
        </div>
        <p className="text-xs text-muted-foreground">{describeRule(rule, currency, d, locale)}</p>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Switch
          checked={rule.active}
          disabled={pending}
          aria-label={rule.name}
          onCheckedChange={(v) => start(async () => toggleRuleAction(rule.id, v))}
        />
        <RuleDialog
          rule={rule}
          services={services}
          currency={currency}
          trigger={
            <Button variant="ghost" size="icon" aria-label={d.common.edit}>
              <Pencil />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={d.common.delete}
          disabled={pending}
          onClick={() => {
            if (!window.confirm(fill(d.pricing.confirmDelete, { name: rule.name }))) return;
            start(async () => {
              const r = await deleteRuleAction(rule.id);
              if (r.ok) toast.success(d.pricing.deleted);
              else toast.error(d.pricing.notFoundRule);
            });
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
