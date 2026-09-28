import type { Queryable } from '@/lib/db';
import type { CompanySettings, Workspace } from '@/lib/types';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'company';
}

/** Find a slug that is not taken yet (`acme`, `acme-2`, `acme-3`, ...). */
export async function uniqueSlug(tx: Queryable, base: string): Promise<string> {
  const root = slugify(base);
  const taken = new Set(
    (await tx.query<{ slug: string }>(`select slug from public.workspaces where slug = $1 or slug like $2`, [root, `${root}-%`])).map(
      (r) => r.slug,
    ),
  );
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now()}`;
}

export interface CreateWorkspaceInput {
  ownerId: string;
  name: string;
  businessType: string;
  phone: string;
  email: string;
  serviceArea: string;
  brandColor: string;
  logoPath: string | null;
  currency: string;
}

/**
 * Creates the company workspace, its owner membership and default settings.
 * Runs under the owner's RLS context: the insert policies require the caller
 * to be the owner they claim to be.
 */
export async function createWorkspace(tx: Queryable, input: CreateWorkspaceInput): Promise<Workspace> {
  const slug = await uniqueSlug(tx, input.name);
  const ws = await tx.one<Workspace>(
    `insert into public.workspaces (owner_id, name, slug, business_type, phone, email, service_area, brand_color, logo_path, currency)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
    [input.ownerId, input.name, slug, input.businessType, input.phone, input.email, input.serviceArea, input.brandColor, input.logoPath, input.currency],
  );
  await tx.query(`insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner')`, [ws!.id, input.ownerId]);
  await tx.query(
    `insert into public.company_settings (workspace_id, public_page_headline, public_page_intro, public_page_thank_you)
     values ($1, $2, $3, $4)`,
    [
      ws!.id,
      `Get an instant estimate from ${input.name}`,
      'Tell us about your project and we will put together an estimate based on our standard rates.',
      'Thanks — we have your details and will be in touch shortly to confirm the estimate.',
    ],
  );
  return ws!;
}

export async function updateWorkspace(
  tx: Queryable,
  workspaceId: string,
  patch: Partial<Pick<Workspace, 'name' | 'business_type' | 'phone' | 'email' | 'service_area' | 'brand_color' | 'logo_path' | 'currency' | 'slug'>>,
): Promise<Workspace | null> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return tx.one<Workspace>(`select * from public.workspaces where id = $1`, [workspaceId]);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  return tx.one<Workspace>(
    `update public.workspaces set ${sets}, updated_at = now() where id = $1 returning *`,
    [workspaceId, ...keys.map((k) => patch[k] ?? null)],
  );
}

export async function updateSettings(
  tx: Queryable,
  workspaceId: string,
  patch: Partial<Pick<CompanySettings, 'default_quote_expiry_days' | 'public_page_enabled' | 'public_page_headline' | 'public_page_intro' | 'public_page_thank_you' | 'quote_footer_note'>>,
): Promise<CompanySettings | null> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return tx.one<CompanySettings>(`select * from public.company_settings where workspace_id = $1`, [workspaceId]);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  return tx.one<CompanySettings>(
    `update public.company_settings set ${sets}, updated_at = now() where workspace_id = $1 returning *`,
    [workspaceId, ...keys.map((k) => patch[k] ?? null)],
  );
}

/** Public lookup for /q/[slug] — runs with admin access, read-only fields. */
export async function getPublicWorkspaceBySlug(
  tx: Queryable,
  slug: string,
): Promise<{ workspace: Workspace; settings: CompanySettings } | null> {
  const workspace = await tx.one<Workspace>(`select * from public.workspaces where slug = $1`, [slug]);
  if (!workspace) return null;
  const settings = await tx.one<CompanySettings>(`select * from public.company_settings where workspace_id = $1`, [workspace.id]);
  if (!settings) return null;
  return { workspace, settings };
}

export async function slugAvailable(tx: Queryable, slug: string, exceptWorkspaceId: string): Promise<boolean> {
  const row = await tx.one(`select id from public.workspaces where slug = $1 and id <> $2`, [slug, exceptWorkspaceId]);
  return !row;
}
