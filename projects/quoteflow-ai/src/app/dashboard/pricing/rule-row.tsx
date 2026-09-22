'use client';

import { useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatMoney, RULE_TYPE_LABEL } from '@/lib/format';
import type { PricingRule, Service } from '@/lib/types';
import { deleteRuleAction, toggleRuleAction } from './actions';
import { RuleDialog } from './rule-dialog';

export function describeRule(rule: PricingRule, currency: string): string {
  const amount = rule.rule_type === 'percentage' ? `${rule.amount > 0 ? '+' : ''}${rule.amount}%` : formatMoney(rule.amount, currency);
  switch (rule.rule_type) {
    case 'fixed':
      return `${amount} flat`;
    case 'per_unit':
      return `${amount} per unit`;
    case 'minimum':
      return `at least ${amount}`;
    case 'location_surcharge':
      return `+${amount} when location contains "${rule.condition_value}"`;
    case 'addon':
      return `${amount}${rule.per_unit ? ' per unit' : ''} when "${rule.condition_value}" is chosen`;
    case 'percentage': {
      if (!rule.condition_key) return `${amount} always`;
      const cond = rule.condition_key === 'urgency' ? `urgency is ${rule.condition_value}` : rule.condition_key === 'option' ? `"${rule.condition_value}" is chosen` : `location contains "${rule.condition_value}"`;
      return `${amount} when ${cond}`;
    }
  }
}

export function RuleRow({ rule, services, currency }: { rule: PricingRule; services: Service[]; currency: string }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{rule.name}</p>
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{RULE_TYPE_LABEL[rule.rule_type]}</span>
        </div>
        <p className="text-xs text-muted-foreground">{describeRule(rule, currency)}</p>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Switch
          checked={rule.active}
          disabled={pending}
          aria-label={`${rule.name} active`}
          onCheckedChange={(v) => start(async () => toggleRuleAction(rule.id, v))}
        />
        <RuleDialog
          rule={rule}
          services={services}
          currency={currency}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Edit rule">
              <Pencil />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete rule"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
            start(async () => {
              const r = await deleteRuleAction(rule.id);
              if (r.ok) toast.success('Rule deleted');
              else toast.error('Rule not found');
            });
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
