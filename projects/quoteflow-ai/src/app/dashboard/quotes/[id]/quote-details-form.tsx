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
import type { Quote } from '@/lib/types';
import { updateQuoteDetailsAction } from '../actions';

export function QuoteDetailsForm({ quote }: { quote: Quote }) {
  const { dict: d } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action] = useFormAction(updateQuoteDetailsAction.bind(null, quote.id), () => {
    setOpen(false);
    toast.success(d.quotes.updated);
  });
  const expires = quote.expires_at ? quote.expires_at.slice(0, 10) : '';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> {d.quotes.editNotesExpiry}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={action} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{d.quotes.editQuote}</DialogTitle>
          </DialogHeader>
          <FormError error={state.error} />
          <Field label={d.quotes.projectSummary} htmlFor="q-summary" error={state.fieldErrors?.project_summary}>
            <Textarea id="q-summary" name="project_summary" rows={3} defaultValue={quote.project_summary ?? ''} />
          </Field>
          <Field label={d.quotes.notesToCustomer} htmlFor="q-notes" error={state.fieldErrors?.notes}>
            <Textarea id="q-notes" name="notes" rows={4} defaultValue={quote.notes ?? ''} placeholder={d.quotes.notesPlaceholder} />
          </Field>
          <Field label={d.quotes.expirationDate} htmlFor="q-expires" error={state.fieldErrors?.expires_at}>
            <Input id="q-expires" name="expires_at" type="date" defaultValue={expires} />
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
