'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { RULE_TYPE_LABEL } from '@/lib/format';
import { RULE_TYPES, type PricingRule, type RuleType, type Service } from '@/lib/types';
import { createRuleAction, updateRuleAction } from './actions';

const HELP: Record<RuleType, string> = {
  fixed: 'A flat base price for the service, e.g. 450 for a drywall repair.',
  per_unit: 'Base price multiplied by the quantity the customer gives, e.g. 35 per m².',
  percentage: 'Adds (or subtracts) a percentage of the subtotal when the condition matches, e.g. +20% for premium paint.',
  minimum: 'Lifts the total to this amount if the calculated price is lower, e.g. minimum job 800.',
  location_surcharge: 'A flat amount added when the customer\'s location contains this text, e.g. +250 for "Jerusalem".',
  addon: 'An optional extra the customer can choose, priced flat or per unit, e.g. scaffolding +900.',
};

export function RuleDialog({ rule, services, defaultServiceId, currency, trigger }: { rule?: PricingRule; services: Service[]; defaultServiceId?: string | null; currency: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const action = rule ? updateRuleAction.bind(null, rule.id) : createRuleAction;
  const [state, formAction] = useFormAction(action, () => {
    setOpen(false);
    toast.success(rule ? 'Rule updated' : 'Rule created');
  });
  const [ruleType, setRuleType] = useState<RuleType>(rule?.rule_type ?? 'per_unit');
  const [serviceId, setServiceId] = useState<string>(rule ? rule.service_id ?? 'all' : defaultServiceId ?? services[0]?.id ?? 'all');
  const [conditionKey, setConditionKey] = useState<string>(rule?.condition_key ?? 'none');
  const [perUnit, setPerUnit] = useState(rule?.per_unit ?? false);
  const [active, setActive] = useState(rule?.active ?? true);

  const impliedCondition = ruleType === 'location_surcharge' ? 'location' : ruleType === 'addon' ? 'option' : null;
  const effectiveCondition = impliedCondition ?? conditionKey;
  const showCondition = ruleType === 'percentage' || ruleType === 'minimum' || impliedCondition !== null;
  const isPercent = ruleType === 'percentage';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{rule ? 'Edit pricing rule' : 'New pricing rule'}</DialogTitle>
            <DialogDescription>Rules are the only source of prices. The assistant never invents a number.</DialogDescription>
          </DialogHeader>
          <FormError error={state.error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Applies to" htmlFor="rule-service">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="rule-service" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="service_id" value={serviceId} />
            </Field>
            <Field label="Rule type" htmlFor="rule-type">
              <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
                <SelectTrigger id="rule-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {RULE_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="rule_type" value={ruleType} />
            </Field>
          </div>
          <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">{HELP[ruleType]}</p>
          <Field label="Name" htmlFor="rule-name" error={state.fieldErrors?.name} hint={ruleType === 'addon' ? 'Shown to customers as the option label.' : 'Appears on the quote breakdown.'}>
            <Input id="rule-name" name="name" defaultValue={rule?.name ?? ''} required placeholder={ruleType === 'per_unit' ? 'Painting per m²' : ruleType === 'addon' ? 'Scaffolding' : 'Urgent job'} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isPercent ? 'Percentage' : `Amount (${currency})`} htmlFor="rule-amount" error={state.fieldErrors?.amount}>
              <div className="relative">
                <Input id="rule-amount" name="amount" type="number" step="0.01" defaultValue={rule?.amount ?? ''} required className={isPercent ? 'pr-8' : ''} />
                {isPercent ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span> : null}
              </div>
            </Field>
            {ruleType === 'addon' ? (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Per unit</p>
                  <p className="text-xs text-muted-foreground">Multiply by quantity</p>
                </div>
                <Switch checked={perUnit} onCheckedChange={setPerUnit} aria-label="Per unit" />
                <input type="hidden" name="per_unit" value={perUnit ? 'true' : 'false'} />
              </div>
            ) : null}
          </div>
          {showCondition ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Condition" htmlFor="rule-condition">
                {impliedCondition ? (
                  <Input value={impliedCondition === 'location' ? 'Location contains' : 'Option selected'} disabled />
                ) : (
                  <>
                    <Select value={conditionKey} onValueChange={setConditionKey}>
                      <SelectTrigger id="rule-condition" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Always</SelectItem>
                        <SelectItem value="urgency">Urgency is</SelectItem>
                        <SelectItem value="option">Option selected</SelectItem>
                        <SelectItem value="location">Location contains</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="condition_key" value={conditionKey} />
                  </>
                )}
              </Field>
              {effectiveCondition !== 'none' ? (
                <Field
                  label={effectiveCondition === 'urgency' ? 'Urgency value' : effectiveCondition === 'location' ? 'Location text' : 'Option key'}
                  htmlFor="rule-condition-value"
                  error={state.fieldErrors?.condition_value}
                  hint={effectiveCondition === 'option' ? 'A short key like premium_paint.' : effectiveCondition === 'urgency' ? 'standard or urgent' : 'Case-insensitive match.'}
                >
                  {effectiveCondition === 'urgency' ? (
                    <Select name="condition_value" defaultValue={rule?.condition_value ?? 'urgent'}>
                      <SelectTrigger id="rule-condition-value" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="rule-condition-value" name="condition_value" defaultValue={rule?.condition_value ?? ''} placeholder={effectiveCondition === 'location' ? 'Jerusalem' : 'premium_paint'} />
                  )}
                </Field>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive rules are ignored by the engine.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Active" />
            <input type="hidden" name="active" value={active ? 'true' : 'false'} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingText="Saving…">{rule ? 'Save changes' : 'Create rule'}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
