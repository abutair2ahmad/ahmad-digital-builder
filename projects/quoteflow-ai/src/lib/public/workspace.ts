import 'server-only';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureDemoSeed } from '@/lib/seed/demo';
import type { CompanySettings, Workspace } from '@/lib/types';
import { getPublicWorkspaceBySlug } from '@/lib/workspace/repo';

export interface PublicWorkspace {
  workspace: Workspace;
  settings: CompanySettings;
}

export async function loadPublicWorkspace(slug: string): Promise<PublicWorkspace | null> {
  await ensureDemoSeed();
  const db = await getDb();
  return getPublicWorkspaceBySlug(db.admin, slug);
}

/** Shared guard for the public API routes. */
export async function requirePublicWorkspace(slug: string): Promise<PublicWorkspace | NextResponse> {
  const pw = await loadPublicWorkspace(slug);
  if (!pw) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  if (!pw.settings.public_page_enabled) return NextResponse.json({ error: 'This company is not accepting requests right now.' }, { status: 403 });
  return pw;
}
