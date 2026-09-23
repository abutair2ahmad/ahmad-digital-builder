'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { useI18n } from '@/lib/i18n/client';
import { fill } from '@/lib/i18n';
import { RULE_TYPES, type PricingRule, type RuleType, type Service } from '@/lib/types';
import { createRuleAction, updateRuleAction } from './actions';

export function RuleDialog({ rule, services, defaultServiceId, currency, trigger }: { rule?: PricingRule; services: Service[]; defaultServiceId?: string | null; currency: string; trigger: ReactNode }) {
  const { dict: d } = useI18n();
  const [open, setOpen] = useState(false);
  const action = rule ? updateRuleAction.bind(null, rule.id) : createRuleAction;
  const [state, formAction] = useFormAction(action, () => {
    setOpen(false);
    toast.success(rule ? d.pricing.updated : d.pricing.created);
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
            <DialogTitle>{rule ? d.pricing.editRule : d.pricing.newRule}</DialogTitle>
            <DialogDescription>{d.pricing.dialogDescription}</DialogDescription>
          </DialogHeader>
          <FormError error={state.error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.pricing.appliesTo} htmlFor="rule-service">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="rule-service" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{d.pricing.allServices}</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="service_id" value={serviceId} />
            </Field>
            <Field label={d.pricing.ruleType} htmlFor="rule-type">
              <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
                <SelectTrigger id="rule-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {d.ruleType[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="rule_type" value={ruleType} />
            </Field>
          </div>
          <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">{d.pricing.help[ruleType]}</p>
          <Field label={d.pricing.name} htmlFor="rule-name" error={state.fieldErrors?.name} hint={ruleType === 'addon' ? d.pricing.nameHintAddon : d.pricing.nameHint}>
            <Input id="rule-name" name="name" defaultValue={rule?.name ?? ''} required placeholder={ruleType === 'per_unit' ? 'Painting per m²' : ruleType === 'addon' ? 'Scaffolding' : 'Urgent job'} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isPercent ? d.pricing.percentage : fill(d.pricing.amountIn, { currency })} htmlFor="rule-amount" error={state.fieldErrors?.amount}>
              <div className="relative">
                <Input id="rule-amount" name="amount" type="number" step="0.01" defaultValue={rule?.amount ?? ''} required className={isPercent ? 'pe-8' : ''} />
                {isPercent ? <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">%</span> : null}
              </div>
            </Field>
            {ruleType === 'addon' ? (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{d.pricing.perUnitLabel}</p>
                  <p className="text-xs text-muted-foreground">{d.pricing.perUnitHint}</p>
                </div>
                <Switch checked={perUnit} onCheckedChange={setPerUnit} aria-label={d.pricing.perUnitLabel} />
                <input type="hidden" name="per_unit" value={perUnit ? 'true' : 'false'} />
              </div>
            ) : null}
          </div>
          {showCondition ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={d.pricing.condition} htmlFor="rule-condition">
                {impliedCondition ? (
                  <Input value={impliedCondition === 'location' ? d.pricing.locationContains : d.pricing.optionSelected} disabled />
                ) : (
                  <>
                    <Select value={conditionKey} onValueChange={setConditionKey}>
                      <SelectTrigger id="rule-condition" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{d.pricing.conditionAlways}</SelectItem>
                        <SelectItem value="urgency">{d.pricing.conditionUrgency}</SelectItem>
                        <SelectItem value="option">{d.pricing.conditionOption}</SelectItem>
                        <SelectItem value="location">{d.pricing.conditionLocation}</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="condition_key" value={conditionKey} />
                  </>
                )}
              </Field>
              {effectiveCondition !== 'none' ? (
                <Field
                  label={effectiveCondition === 'urgency' ? d.pricing.urgencyValue : effectiveCondition === 'location' ? d.pricing.locationText : d.pricing.optionKey}
                  htmlFor="rule-condition-value"
                  error={state.fieldErrors?.condition_value}
                  hint={effectiveCondition === 'option' ? d.pricing.optionKeyHint : effectiveCondition === 'urgency' ? d.pricing.urgencyHint : d.pricing.locationHint}
                >
                  {effectiveCondition === 'urgency' ? (
                    <Select name="condition_value" defaultValue={rule?.condition_value ?? 'urgent'}>
                      <SelectTrigger id="rule-condition-value" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">{d.status.urgency.urgent}</SelectItem>
                        <SelectItem value="standard">{d.status.urgency.standard}</SelectItem>
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
              <p className="text-sm font-medium">{d.common.active}</p>
              <p className="text-xs text-muted-foreground">{d.pricing.activeHint}</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} aria-label={d.common.active} />
            <input type="hidden" name="active" value={active ? 'true' : 'false'} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {d.common.cancel}
            </Button>
            <SubmitButton pendingText={d.common.saving}>{rule ? d.common.saveChanges : d.pricing.createRule}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
