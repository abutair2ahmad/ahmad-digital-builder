import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { quotePdfResponse } from '@/lib/pdf/serve';
import { getQuoteByToken } from '@/lib/quotes/repo';
import type { CompanySettings, Workspace } from '@/lib/types';
import { getI18n } from '@/lib/i18n/server';

/** PDF for the customer, addressed by the unguessable quote token. Drafts are not exposed. */
export async function GET(_req: Request, { params }: RouteContext<'/api/public/quote/[token]/pdf'>) {
  const { token } = await params;
  const { dict: d } = await getI18n();
  const db = await getDb();
  const quote = await getQuoteByToken(db.admin, token);
  if (!quote || quote.status === 'draft') return NextResponse.json({ error: d.common.notFound }, { status: 404 });
  const workspace = await db.admin.one<Workspace>(`select * from public.workspaces where id = $1`, [quote.workspace_id]);
  const settings = await db.admin.one<CompanySettings>(`select * from public.company_settings where workspace_id = $1`, [quote.workspace_id]);
  if (!workspace || !settings) return NextResponse.json({ error: d.common.notFound }, { status: 404 });
  return quotePdfResponse(quote, workspace, settings);
}
