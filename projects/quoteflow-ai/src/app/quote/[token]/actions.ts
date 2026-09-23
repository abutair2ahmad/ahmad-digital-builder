'use server';

import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activities/repo';
import { getDb } from '@/lib/db';
import { updateLeadStatus } from '@/lib/leads/repo';
import { decideQuote, getQuoteByToken } from '@/lib/quotes/repo';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';

/** The customer's decision from their quote link. The token is the credential. */
export async function decideQuoteAction(token: string, decision: 'accepted' | 'rejected'): Promise<{ ok: boolean; error?: string }> {
  const { dict: d } = await getI18n();
  const db = await getDb();
  const result = await db.adminTransaction(async (tx) => {
    const quote = await getQuoteByToken(tx, token);
    if (!quote || quote.status === 'draft') return { error: d.quotes.notFound };
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) return { error: d.quoteView.expiredError };
    const updated = await decideQuote(tx, quote.id, decision);
    if (!updated) return { error: d.quoteView.notOpen };
    if (quote.lead_id) await updateLeadStatus(tx, quote.workspace_id, quote.lead_id, decision === 'accepted' ? 'won' : 'lost');
    await logActivity(tx, {
      workspaceId: quote.workspace_id,
      type: `quote.${decision}`,
      entityType: 'quote',
      entityId: quote.id,
      message: fill(d.activity.quoteDecidedOnline, {
        name: quote.customer_name ?? d.activity.customerFallback,
        decision: decision === 'accepted' ? d.activity.decisionAccepted : d.activity.decisionDeclined,
        number: quote.quote_number,
      }),
    });
    return { error: undefined };
  });
  if (result.error) return { ok: false, error: result.error };
  revalidatePath(`/quote/${token}`);
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
