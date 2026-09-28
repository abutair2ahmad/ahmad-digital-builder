'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { useI18n } from '@/lib/i18n/client';
import type { Customer } from '@/lib/types';
import { updateCustomerAction } from '../actions';

export function CustomerForm({ customer }: { customer: Customer }) {
  const { dict: d } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action] = useFormAction(updateCustomerAction.bind(null, customer.id), () => {
    setOpen(false);
    toast.success(d.customers.updated);
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> {d.common.edit}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{d.customers.editCustomer}</DialogTitle>
          </DialogHeader>
          <FormError error={state.error} />
          <Field label={d.customers.name} htmlFor="c-name" error={state.fieldErrors?.name}>
            <Input id="c-name" name="name" defaultValue={customer.name} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.customers.phone} htmlFor="c-phone" error={state.fieldErrors?.phone}>
              <Input id="c-phone" name="phone" defaultValue={customer.phone ?? ''} />
            </Field>
            <Field label={d.auth.email} htmlFor="c-email" error={state.fieldErrors?.email}>
              <Input id="c-email" name="email" type="email" defaultValue={customer.email ?? ''} />
            </Field>
          </div>
          <Field label={d.customers.notes} htmlFor="c-notes" error={state.fieldErrors?.notes}>
            <Textarea id="c-notes" name="notes" rows={4} defaultValue={customer.notes ?? ''} placeholder={d.customers.notesPlaceholder} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {d.common.cancel}
            </Button>
            <SubmitButton pendingText={d.common.saving}>{d.common.save}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
