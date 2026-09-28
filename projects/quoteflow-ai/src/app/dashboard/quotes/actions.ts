'use server';

import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activities/repo';
import { touchCustomer } from '@/lib/customers/repo';
import { updateLeadStatus } from '@/lib/leads/repo';
import { getQuote, updateQuoteDetails, updateQuoteStatus } from '@/lib/quotes/repo';
import type { QuoteStatus } from '@/lib/types';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { fieldErrorsOf, quoteDetailsSchema, quoteStatusSchema, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';

/** Which transitions a member may make by hand. Viewed is set by the customer. */
const ALLOWED: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired', 'draft'],
  viewed: ['accepted', 'rejected', 'expired'],
  accepted: ['draft'],
  rejected: ['draft'],
  expired: ['sent', 'draft'],
};

export async function setQuoteStatusAction(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const { dict: d } = await getI18n();
  const parsed = quoteStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: d.quotes.unknownStatus };
  const next = parsed.data as QuoteStatus;
  const result = await runAsMember(async (tx, ctx) => {
    const quote = await getQuote(tx, ctx.workspace.id, id);
    if (!quote) return { error: d.quotes.notFound };
    if (!ALLOWED[quote.status].includes(next)) {
      return { error: fill(d.quotes.illegalTransition, { from: d.status.quote[quote.status], to: d.status.quote[next] }) };
    }
    const updated = await updateQuoteStatus(tx, ctx.workspace.id, id, next);
    if (!updated) return { error: d.quotes.notFound };
    // Keep the lead's pipeline stage in step with the quote.
    if (quote.lead_id) {
      const leadStatus = next === 'sent' ? 'quote_sent' : next === 'accepted' ? 'won' : next === 'rejected' ? 'lost' : null;
      if (leadStatus) await updateLeadStatus(tx, ctx.workspace.id, quote.lead_id, leadStatus);
    }
    if (quote.customer_id) await touchCustomer(tx, ctx.workspace.id, quote.customer_id);
    await logActivity(tx, {
      workspaceId: ctx.workspace.id,
      type: `quote.${next}`,
      entityType: 'quote',
      entityId: id,
      message: fill(d.activity.quoteStatus, {
        number: quote.quote_number,
        name: quote.customer_name ?? d.activity.customerFallback,
        status: d.status.quote[next],
      }),
    });
    return { error: undefined };
  });
  if (result.error) return { ok: false, error: result.error };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/quotes');
  revalidatePath(`/dashboard/quotes/${id}`);
  revalidatePath('/dashboard/leads');
  return { ok: true };
}

export async function updateQuoteDetailsAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const parsed = quoteDetailsSchema().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) };
  const updated = await runAsMember((tx, ctx) => updateQuoteDetails(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: d.quotes.notFound };
  revalidatePath(`/dashboard/quotes/${id}`);
  return { ok: true, stamp: Date.now() };
}
