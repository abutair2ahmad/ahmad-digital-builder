'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { useI18n } from '@/lib/i18n/client';
import type { Lead } from '@/lib/types';
import { updateLeadDetailsAction } from '../actions';

export function LeadDetailForm({ lead, unit }: { lead: Lead; unit: string | null }) {
  const { dict: d } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action] = useFormAction(updateLeadDetailsAction.bind(null, lead.id), () => {
    setOpen(false);
    toast.success(d.leads.updated);
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> {d.leads.editDetails}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{d.leads.editLead}</DialogTitle>
          </DialogHeader>
          <FormError error={state.error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.leads.customer} htmlFor="lead-name" error={state.fieldErrors?.customer_name} className="sm:col-span-2">
              <Input id="lead-name" name="customer_name" defaultValue={lead.customer_name} required />
            </Field>
            <Field label={d.customers.phone} htmlFor="lead-phone" error={state.fieldErrors?.phone}>
              <Input id="lead-phone" name="phone" defaultValue={lead.phone ?? ''} />
            </Field>
            <Field label={d.auth.email} htmlFor="lead-email" error={state.fieldErrors?.email}>
              <Input id="lead-email" name="email" type="email" defaultValue={lead.email ?? ''} />
            </Field>
            <Field label={d.leads.location} htmlFor="lead-location" error={state.fieldErrors?.location}>
              <Input id="lead-location" name="location" defaultValue={lead.location ?? ''} />
            </Field>
            <Field label={`${d.leads.quantity}${unit ? ` (${unit})` : ''}`} htmlFor="lead-qty" error={state.fieldErrors?.quantity}>
              <Input id="lead-qty" name="quantity" type="number" step="0.01" min={0} defaultValue={lead.quantity ?? ''} />
            </Field>
            <Field label={d.leads.urgency} htmlFor="lead-urgency" className="sm:col-span-2">
              <Select name="urgency" defaultValue={lead.urgency}>
                <SelectTrigger id="lead-urgency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{d.status.urgency.standard}</SelectItem>
                  <SelectItem value="urgent">{d.status.urgency.urgent}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={d.leads.projectDescription} htmlFor="lead-desc" error={state.fieldErrors?.project_description} className="sm:col-span-2">
              <Textarea id="lead-desc" name="project_description" rows={4} defaultValue={lead.project_description ?? ''} />
            </Field>
          </div>
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
