'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { useI18n } from '@/lib/i18n/client';
import type { Service } from '@/lib/types';
import { createServiceAction, updateServiceAction } from './actions';

const UNITS = ['m²', 'hour', 'item', 'room', 'linear metre', 'day', 'km'];

export function ServiceDialog({ service, trigger }: { service?: Service; trigger: ReactNode }) {
  const { dict: d } = useI18n();
  const [open, setOpen] = useState(false);
  const action = service ? updateServiceAction.bind(null, service.id) : createServiceAction;
  const [state, formAction] = useFormAction(action, () => {
    setOpen(false);
    toast.success(service ? d.services.updated : d.services.created);
  });
  const [pricingType, setPricingType] = useState<'fixed' | 'per_unit'>(service?.pricing_type ?? 'per_unit');
  const [active, setActive] = useState(service?.active ?? true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{service ? d.services.editService : d.services.newService}</DialogTitle>
            <DialogDescription>{d.services.dialogDescription}</DialogDescription>
          </DialogHeader>
          <FormError error={state.error} />
          <Field label={d.services.name} htmlFor="svc-name" error={state.fieldErrors?.name}>
            <Input id="svc-name" name="name" defaultValue={service?.name ?? ''} required placeholder={d.services.namePlaceholder} />
          </Field>
          <Field label={d.services.description} htmlFor="svc-description" error={state.fieldErrors?.description} hint={d.services.descriptionHint}>
            <Textarea id="svc-description" name="description" defaultValue={service?.description ?? ''} rows={3} placeholder={d.services.descriptionPlaceholder} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.services.basePricingType} htmlFor="svc-pricing-type">
              <Select value={pricingType} onValueChange={(v) => setPricingType(v as 'fixed' | 'per_unit')}>
                <SelectTrigger id="svc-pricing-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_unit">{d.services.perUnit}</SelectItem>
                  <SelectItem value="fixed">{d.services.fixedPrice}</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="pricing_type" value={pricingType} />
            </Field>
            <Field label={d.services.unit} htmlFor="svc-unit" error={state.fieldErrors?.unit} hint={pricingType === 'fixed' ? d.services.unitNotNeeded : undefined}>
              <Input id="svc-unit" name="unit" list="svc-units" defaultValue={service?.unit ?? 'm²'} disabled={pricingType === 'fixed'} placeholder="m²" />
              <datalist id="svc-units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{d.common.active}</p>
              <p className="text-xs text-muted-foreground">{d.services.activeHint}</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} aria-label={d.common.active} />
            <input type="hidden" name="active" value={active ? 'true' : 'false'} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {d.common.cancel}
            </Button>
            <SubmitButton pendingText={d.common.saving}>{service ? d.common.saveChanges : d.services.createService}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
