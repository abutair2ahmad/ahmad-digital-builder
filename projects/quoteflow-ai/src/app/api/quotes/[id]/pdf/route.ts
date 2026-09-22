import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { quotePdfResponse } from '@/lib/pdf/serve';
import { getQuote } from '@/lib/quotes/repo';
import { getWorkspaceContext } from '@/lib/workspace/context';

/** PDF for a signed-in member; the quote lookup runs under RLS. */
export async function GET(_req: Request, { params }: RouteContext<'/api/quotes/[id]/pdf'>) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();
  if (!ctx?.workspace || !ctx.settings) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const db = await getDb();
  const workspaceId = ctx.workspace.id;
  const quote = await db.asUser(ctx.user.id, (tx) => getQuote(tx, workspaceId, id));
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return quotePdfResponse(quote, ctx.workspace, ctx.settings);
}
