import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nextAgentTurn } from '@/lib/ai/agent';
import { buildAgentContext } from '@/lib/ai/context';
import { CollectedSchema } from '@/lib/ai/schema';
import { getDb } from '@/lib/db';
import { requirePublicWorkspace } from '@/lib/public/workspace';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { getI18n } from '@/lib/i18n/server';

const BodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['assistant', 'user']), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(60),
  collected: CollectedSchema,
});

export async function POST(req: Request, { params }: RouteContext<'/api/public/[slug]/agent'>) {
  const { slug } = await params;
  const { dict: d, locale } = await getI18n();
  const limited = rateLimit(clientKey(req, 'agent'), 40, 60_000);
  if (!limited.ok) return NextResponse.json({ error: d.agent.tooManyMessages }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } });

  const pw = await requirePublicWorkspace(slug);
  if (pw instanceof NextResponse) return pw;

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: d.validation.invalidRequest }, { status: 400 });
  if (body.data.messages.at(-1)?.role !== 'user') return NextResponse.json({ error: d.validation.invalidRequest }, { status: 400 });

  const db = await getDb();
  const ctx = await buildAgentContext(db.admin, pw.workspace);
  if (!ctx.services.length) return NextResponse.json({ error: d.agent.noServicesPublished }, { status: 409 });

  const turn = await nextAgentTurn(ctx, body.data.messages, body.data.collected, d, locale);
  return NextResponse.json(turn);
}
