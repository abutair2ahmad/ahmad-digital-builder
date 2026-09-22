'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import type { Quote } from '@/lib/types';
import { updateQuoteDetailsAction } from '../actions';

export function QuoteDetailsForm({ quote }: { quote: Quote }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormAction(updateQuoteDetailsAction.bind(null, quote.id), () => {
    setOpen(false);
    toast.success('Quote updated');
  });
  const expires = quote.expires_at ? quote.expires_at.slice(0, 10) : '';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> Edit notes & expiry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit quote</DialogTitle>
          </DialogHeader>
          <FormError error={state.error} />
          <Field label="Project summary" htmlFor="q-summary" error={state.fieldErrors?.project_summary}>
            <Textarea id="q-summary" name="project_summary" rows={3} defaultValue={quote.project_summary ?? ''} />
          </Field>
          <Field label="Notes to customer" htmlFor="q-notes" error={state.fieldErrors?.notes}>
            <Textarea id="q-notes" name="notes" rows={4} defaultValue={quote.notes ?? ''} placeholder="Payment terms, what's included, next steps…" />
          </Field>
          <Field label="Expiration date" htmlFor="q-expires" error={state.fieldErrors?.expires_at}>
            <Input id="q-expires" name="expires_at" type="date" defaultValue={expires} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
