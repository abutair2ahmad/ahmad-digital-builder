import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, type AuthUser } from '@/lib/auth';
import { getDb, type Queryable } from '@/lib/db';
import type { CompanySettings, UserProfile, Workspace } from '@/lib/types';

export interface WorkspaceContext {
  user: AuthUser;
  profile: UserProfile | null;
  workspace: Workspace | null;
  settings: CompanySettings | null;
}

export interface MemberContext extends WorkspaceContext {
  workspace: Workspace;
  settings: CompanySettings;
}

/**
 * The signed-in user's workspace, resolved under row-level security so the
 * result can only ever be a workspace they belong to. Memoised per request.
 */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await getDb();
  return db.asUser(user.id, async (tx) => {
    const profile = await tx.one<UserProfile>(`select * from public.users where id = $1`, [user.id]);
    const workspace = await tx.one<Workspace>(
      `select w.* from public.workspaces w
       join public.workspace_members m on m.workspace_id = w.id
       where m.user_id = $1
       order by w.created_at asc limit 1`,
      [user.id],
    );
    const settings = workspace
      ? await tx.one<CompanySettings>(`select * from public.company_settings where workspace_id = $1`, [workspace.id])
      : null;
    return { user, profile, workspace, settings };
  });
});

/** Redirects to /login without a user and to /onboarding without a workspace. */
export async function requireWorkspace(): Promise<MemberContext> {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect('/login');
  if (!ctx.workspace || !ctx.settings) redirect('/onboarding');
  return ctx as MemberContext;
}

/** Run a unit of work as the current member, with RLS enforced. */
export async function runAsMember<T>(fn: (tx: Queryable, ctx: MemberContext) => Promise<T>): Promise<T> {
  const ctx = await requireWorkspace();
  const db = await getDb();
  return db.asUser(ctx.user.id, (tx) => fn(tx, ctx));
}
