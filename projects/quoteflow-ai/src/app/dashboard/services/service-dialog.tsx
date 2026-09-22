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
import type { Service } from '@/lib/types';
import { createServiceAction, updateServiceAction } from './actions';

const UNITS = ['m²', 'hour', 'item', 'room', 'linear metre', 'day', 'km'];

export function ServiceDialog({ service, trigger }: { service?: Service; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const action = service ? updateServiceAction.bind(null, service.id) : createServiceAction;
  const [state, formAction] = useFormAction(action, () => {
    setOpen(false);
    toast.success(service ? 'Service updated' : 'Service created');
  });
  const [pricingType, setPricingType] = useState<'fixed' | 'per_unit'>(service?.pricing_type ?? 'per_unit');
  const [active, setActive] = useState(service?.active ?? true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{service ? 'Edit service' : 'New service'}</DialogTitle>
            <DialogDescription>Services are what customers can request. Prices are set separately in Pricing rules.</DialogDescription>
          </DialogHeader>
          <FormError error={state.error} />
          <Field label="Name" htmlFor="svc-name" error={state.fieldErrors?.name}>
            <Input id="svc-name" name="name" defaultValue={service?.name ?? ''} required placeholder="Interior painting" />
          </Field>
          <Field label="Description" htmlFor="svc-description" error={state.fieldErrors?.description} hint="Shown to customers and used by the assistant to match requests.">
            <Textarea id="svc-description" name="description" defaultValue={service?.description ?? ''} rows={3} placeholder="Walls and ceilings, two coats, minor filling included." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Base pricing type" htmlFor="svc-pricing-type">
              <Select value={pricingType} onValueChange={(v) => setPricingType(v as 'fixed' | 'per_unit')}>
                <SelectTrigger id="svc-pricing-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_unit">Per unit</SelectItem>
                  <SelectItem value="fixed">Fixed price</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="pricing_type" value={pricingType} />
            </Field>
            <Field label="Unit" htmlFor="svc-unit" error={state.fieldErrors?.unit} hint={pricingType === 'fixed' ? 'Not needed for fixed-price services.' : undefined}>
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
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive services are hidden from the public page.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Active" />
            <input type="hidden" name="active" value={active ? 'true' : 'false'} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingText="Saving…">{service ? 'Save changes' : 'Create service'}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
