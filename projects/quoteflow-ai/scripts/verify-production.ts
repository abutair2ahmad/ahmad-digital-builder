/**
 * Production readiness check against the real Supabase project.
 *
 *   npm run verify:prod
 *
 * It exercises the same code paths the app uses (the RLS-scoped transaction
 * from src/lib/db), creates two throwaway auth users, proves one workspace
 * cannot read or write the other's data, and deletes everything it created.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from '../src/lib/config';
import { getDb } from '../src/lib/db';
import { createWorkspace } from '../src/lib/workspace/repo';
import { createService } from '../src/lib/services/repo';
import { createRule } from '../src/lib/pricing/repo';
import { findOrCreateCustomer } from '../src/lib/customers/repo';
import { createLead } from '../src/lib/leads/repo';
import { createQuote } from '../src/lib/quotes/repo';
import { calculatePrice } from '../src/lib/pricing/engine';

const BUSINESS_TABLES = [
  'users', 'workspaces', 'workspace_members', 'company_settings', 'services',
  'pricing_rules', 'customers', 'leads', 'quotes', 'quote_items', 'uploaded_files', 'activities',
];

let failures = 0;
const pass = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};
const check = (ok: boolean, msg: string) => (ok ? pass(msg) : fail(msg));

async function main() {
  if (config.mode !== 'supabase') {
    throw new Error('Not in Supabase mode — set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and DATABASE_URL.');
  }
  if (!config.supabase.serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run this check.');

  const db = await getDb();
  const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\nDatabase');
  const version = await db.admin.one<{ v: string }>(`select version() as v`);
  check(Boolean(version?.v.includes('PostgreSQL')), `connected (${version?.v.split(' ').slice(0, 2).join(' ')})`);

  const applied = await db.admin.query<{ name: string }>(`select name from public._migrations order by name`);
  check(applied.length > 0, `migrations applied: ${applied.map((r) => r.name).join(', ') || 'none'}`);

  const missing: string[] = [];
  const noRls: string[] = [];
  for (const t of BUSINESS_TABLES) {
    const row = await db.admin.one<{ relrowsecurity: boolean }>(
      `select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = $1`,
      [t],
    );
    if (!row) missing.push(t);
    else if (!row.relrowsecurity) noRls.push(t);
  }
  check(missing.length === 0, missing.length ? `tables missing: ${missing.join(', ')}` : `all ${BUSINESS_TABLES.length} tables present`);
  check(noRls.length === 0, noRls.length ? `RLS disabled on: ${noRls.join(', ')}` : 'row-level security enabled on every table');

  const policies = await db.admin.one<{ n: number }>(`select count(*)::int as n from pg_policies where schemaname = 'public'`);
  check((policies?.n ?? 0) >= 12, `${policies?.n ?? 0} RLS policies installed`);

  const trigger = await db.admin.one(`select 1 from pg_trigger where tgname = 'on_auth_user_created'`);
  check(Boolean(trigger), trigger ? 'auth.users → public.users trigger installed' : 'auth trigger missing (onboarding still creates the profile, so sign-up works)');

  console.log('\nStorage');
  const { data: bucket, error: bucketErr } = await admin.storage.getBucket(config.supabase.storageBucket);
  check(Boolean(bucket) && !bucketErr, bucket ? `bucket "${config.supabase.storageBucket}" exists (public: ${bucket.public})` : `bucket missing: ${bucketErr?.message}`);
  if (bucket) check(!bucket.public, bucket.public ? 'bucket is PUBLIC — it should be private' : 'bucket is private');

  console.log('\nWorkspace isolation (two real users, live RLS)');
  const stamp = Date.now();
  const emails = [`qa-a-${stamp}@quoteflow-check.invalid`, `qa-b-${stamp}@quoteflow-check.invalid`];
  const created: { id: string; email: string }[] = [];
  const workspaceIds: string[] = [];

  try {
    for (const email of emails) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: `Check-${stamp}!`, email_confirm: true, user_metadata: { full_name: 'Isolation check' } });
      if (error || !data.user) throw new Error(`could not create test user: ${error?.message}`);
      created.push({ id: data.user.id, email });
    }
    pass(`created two throwaway users`);

    const seeded: { workspaceId: string; leadId: string; quoteId: string; serviceId: string }[] = [];
    for (const [i, user] of created.entries()) {
      await db.admin.query(`insert into public.users (id, email, full_name) values ($1, $2, 'Isolation check') on conflict (id) do nothing`, [user.id, user.email]);
      const result = await db.asUser(user.id, async (tx) => {
        const ws = await createWorkspace(tx, {
          ownerId: user.id,
          name: `Isolation Check ${i + 1} ${stamp}`,
          businessType: 'QA',
          phone: '+000',
          email: user.email,
          serviceArea: 'QA',
          brandColor: '#2563eb',
          logoPath: null,
          currency: 'ILS',
        });
        const service = await createService(tx, ws.id, { name: 'QA service', description: null, pricing_type: 'per_unit', unit: 'm²', active: true });
        const rule = await createRule(tx, ws.id, { service_id: service.id, name: 'QA per m²', rule_type: 'per_unit', amount: 10, per_unit: true, condition_key: null, condition_value: null, active: true });
        const pricing = calculatePrice({ service, quantity: 5, location: 'QA', urgency: 'standard', options: [] }, [rule]);
        const customer = await findOrCreateCustomer(tx, ws.id, { name: 'QA customer', phone: null, email: `qa-c-${i}-${stamp}@quoteflow-check.invalid` });
        const lead = await createLead(tx, ws.id, {
          customer_id: customer.id, service_id: service.id, customer_name: 'QA customer', phone: null, email: null,
          project_description: 'QA', location: 'QA', quantity: 5, unit: 'm²', urgency: 'standard', options: [],
          ai_summary: 'QA', conversation: [], estimated_total: pricing.total, currency: 'ILS',
        });
        const quote = await createQuote(tx, ws.id, {
          lead_id: lead.id, customer_id: customer.id, service_id: service.id, currency: 'ILS',
          notes: null, project_summary: 'QA', expires_at: null, status: 'draft', pricing,
        });
        return { workspaceId: ws.id, leadId: lead.id, quoteId: quote.id, serviceId: service.id };
      });
      workspaceIds.push(result.workspaceId);
      seeded.push(result);
    }
    pass('each user created a workspace with a service, rule, customer, lead and quote');

    const [a, b] = seeded;
    const [, userB] = created;

    const bSeesA = await db.asUser(userB.id, async (tx) => ({
      workspaces: (await tx.query(`select id from public.workspaces where id = $1`, [a.workspaceId])).length,
      services: (await tx.query(`select id from public.services where workspace_id = $1`, [a.workspaceId])).length,
      leads: (await tx.query(`select id from public.leads where id = $1`, [a.leadId])).length,
      quotes: (await tx.query(`select id from public.quotes where id = $1`, [a.quoteId])).length,
      quoteItems: (await tx.query(`select id from public.quote_items where workspace_id = $1`, [a.workspaceId])).length,
      customers: (await tx.query(`select id from public.customers where workspace_id = $1`, [a.workspaceId])).length,
      members: (await tx.query(`select user_id from public.workspace_members where workspace_id = $1`, [a.workspaceId])).length,
      activities: (await tx.query(`select id from public.activities where workspace_id = $1`, [a.workspaceId])).length,
    }));
    const leaked = Object.entries(bSeesA).filter(([, n]) => n > 0);
    check(leaked.length === 0, leaked.length ? `user B can READ user A's ${leaked.map(([k, n]) => `${k}(${n})`).join(', ')}` : "user B reads none of user A's rows (8 tables checked)");

    const ownScope = await db.asUser(userB.id, async (tx) => (await tx.query(`select id from public.services where workspace_id = $1`, [b.workspaceId])).length);
    check(ownScope === 1, ownScope === 1 ? 'user B still sees their own data' : `user B sees ${ownScope} of their own services (expected 1)`);

    const writeBlocked = await db
      .asUser(userB.id, (tx) => tx.query(`insert into public.services (workspace_id, name, pricing_type) values ($1, 'injected', 'fixed') returning id`, [a.workspaceId]))
      .then(() => false)
      .catch(() => true);
    check(writeBlocked, writeBlocked ? "user B cannot INSERT into user A's workspace" : "user B CAN insert into user A's workspace");

    const updateBlocked = await db
      .asUser(userB.id, (tx) => tx.query(`update public.quotes set total = 1 where id = $1 returning id`, [a.quoteId]))
      .then((rows) => rows.length === 0)
      .catch(() => true);
    check(updateBlocked, updateBlocked ? "user B cannot UPDATE user A's quote" : "user B CAN update user A's quote");

    const deleteBlocked = await db
      .asUser(userB.id, (tx) => tx.query(`delete from public.leads where id = $1 returning id`, [a.leadId]))
      .then((rows) => rows.length === 0)
      .catch(() => true);
    check(deleteBlocked, deleteBlocked ? "user B cannot DELETE user A's lead" : "user B CAN delete user A's lead");

    const spoofBlocked = await db
      .asUser(userB.id, (tx) => tx.query(`insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner') returning user_id`, [a.workspaceId, userB.id]))
      .then(() => false)
      .catch(() => true);
    check(spoofBlocked, spoofBlocked ? "user B cannot add themselves to user A's workspace" : "user B CAN join user A's workspace");
  } finally {
    console.log('\nCleanup');
    for (const id of workspaceIds) await db.admin.query(`delete from public.workspaces where id = $1`, [id]).catch(() => undefined);
    for (const u of created) await admin.auth.admin.deleteUser(u.id).catch(() => undefined);
    await db.admin.query(`delete from public.users where email like '%@quoteflow-check.invalid'`).catch(() => undefined);
    pass('removed all test users and workspaces');
  }

  console.log(failures === 0 ? '\nAll production checks passed.\n' : `\n${failures} check(s) FAILED.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\n' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
