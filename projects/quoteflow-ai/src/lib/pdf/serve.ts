import 'server-only';
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import type { QuoteDetail } from '@/lib/quotes/repo';
import { getStorage } from '@/lib/storage';
import type { CompanySettings, Workspace } from '@/lib/types';
import { renderQuotePdf } from './quote-pdf';

export async function quotePdfResponse(quote: QuoteDetail, workspace: Workspace, settings: CompanySettings): Promise<NextResponse> {
  let logo: Buffer | null = null;
  if (workspace.logo_path && !workspace.logo_path.endsWith('.svg')) {
    const storage = await getStorage();
    logo = (await storage.get(workspace.logo_path))?.bytes ?? null;
  }
  const pdf = await renderQuotePdf({ quote, workspace, settings, logo, publicUrl: `${config.appUrl}/quote/${quote.public_token}` });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.quote_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
