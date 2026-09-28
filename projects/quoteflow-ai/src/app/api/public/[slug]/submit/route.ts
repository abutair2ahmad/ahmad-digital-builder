import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CollectedSchema, missingFields } from '@/lib/ai/schema';
import { buildAgentContext } from '@/lib/ai/context';
import { getDb } from '@/lib/db';
import { intakeLead } from '@/lib/leads/intake';
import { requirePublicWorkspace } from '@/lib/public/workspace';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { contactSchema } from '@/lib/validation';
import { getI18n } from '@/lib/i18n/server';
import { fill } from '@/lib/i18n';

const bodySchema = (d: Parameters<typeof contactSchema>[0]) =>
  z.object({
    collected: CollectedSchema,
    summary: z.string().trim().max(2000).nullable(),
    conversation: z.array(z.object({ role: z.enum(['assistant', 'user']), content: z.string().trim().max(2000) })).max(80),
    contact: contactSchema(d),
    fileIds: z.array(z.string().uuid()).max(20).default([]),
  });

export async function POST(req: Request, { params }: RouteContext<'/api/public/[slug]/submit'>) {
  const { slug } = await params;
  const { dict: d } = await getI18n();
  const limited = rateLimit(clientKey(req, 'submit'), 10, 60_000);
  if (!limited.ok) return NextResponse.json({ error: d.validation.tooManyRequests }, { status: 429 });
  const pw = await requirePublicWorkspace(slug);
  if (pw instanceof NextResponse) return pw;

  const body = bodySchema(d).safeParse(await req.json().catch(() => null));
  if (!body.success) {
    const first = body.error.issues[0];
    return NextResponse.json({ error: first?.message ?? d.validation.invalidRequest, field: first?.path.join('.') }, { status: 400 });
  }

  const db = await getDb();
  const agentCtx = await buildAgentContext(db.admin, pw.workspace);
  const missing = missingFields(agentCtx, body.data.collected);
  if (missing.length) return NextResponse.json({ error: fill(d.validation.stillMissing, { fields: missing.join(', ') }) }, { status: 422 });

  try {
    const result = await db.adminTransaction((tx) => intakeLead(tx, pw.workspace, pw.settings, body.data));
    return NextResponse.json({
      leadId: result.lead.id,
      quoteNumber: result.quote.quote_number,
      estimate: {
        total: result.pricing.total,
        subtotal: result.pricing.subtotal,
        modifiers_total: result.pricing.modifiers_total,
        currency: pw.workspace.currency,
        lines: result.pricing.lines.map((l) => ({ kind: l.kind, label: l.label, description: l.description, amount: l.amount })),
        warnings: result.pricing.warnings,
      },
      thankYou: pw.settings.public_page_thank_you,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : d.validation.couldNotSubmit }, { status: 400 });
  }
}
