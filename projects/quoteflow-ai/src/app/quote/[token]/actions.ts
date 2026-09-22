'use server';

import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activities/repo';
import { getDb } from '@/lib/db';
import { updateLeadStatus } from '@/lib/leads/repo';
import { decideQuote, getQuoteByToken } from '@/lib/quotes/repo';

/** The customer's decision from their quote link. The token is the credential. */
export async function decideQuoteAction(token: string, decision: 'accepted' | 'rejected'): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const result = await db.adminTransaction(async (tx) => {
    const quote = await getQuoteByToken(tx, token);
    if (!quote || quote.status === 'draft') return { error: 'Quote not found.' };
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) return { error: 'This quote has expired. Please contact us for an updated estimate.' };
    const updated = await decideQuote(tx, quote.id, decision);
    if (!updated) return { error: 'This quote is no longer open.' };
    if (quote.lead_id) await updateLeadStatus(tx, quote.workspace_id, quote.lead_id, decision === 'accepted' ? 'won' : 'lost');
    await logActivity(tx, {
      workspaceId: quote.workspace_id,
      type: `quote.${decision}`,
      entityType: 'quote',
      entityId: quote.id,
      message: `${quote.customer_name ?? 'Customer'} ${decision === 'accepted' ? 'accepted' : 'declined'} quote ${quote.quote_number} online`,
    });
    return { error: undefined };
  });
  if (result.error) return { ok: false, error: result.error };
  revalidatePath(`/quote/${token}`);
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
