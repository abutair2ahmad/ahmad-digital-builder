-- ============================================================================
-- QuoteFlow AI — multi-tenant schema
--
-- Every business table carries a workspace_id, and every one of them is
-- protected by row-level security keyed on workspace membership. The same
-- file runs on Supabase and on the embedded local database.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, created by trigger on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Attaching a trigger to auth.users needs ownership of that table. It works on
-- Supabase as the `postgres` role and locally; if a restricted role runs the
-- migration we skip it rather than failing — onboarding upserts the profile
-- with the id from the verified session either way.
do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when insufficient_privilege then
    raise notice 'Skipping auth.users trigger: insufficient privileges. Profiles are created during onboarding instead.';
end $$;

-- ---------------------------------------------------------------------------
-- Workspaces (one per company) and membership.
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete restrict,
  name text not null,
  slug text not null unique,
  business_type text,
  phone text,
  email text,
  service_area text,
  logo_path text,
  brand_color text not null default '#2563eb',
  currency text not null default 'ILS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id);

create table if not exists public.company_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  default_quote_expiry_days integer not null default 14 check (default_quote_expiry_days between 1 and 365),
  public_page_enabled boolean not null default true,
  public_page_headline text,
  public_page_intro text,
  public_page_thank_you text,
  quote_footer_note text,
  quote_seq integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalogue: services and the deterministic pricing rules attached to them.
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  pricing_type text not null check (pricing_type in ('fixed', 'per_unit')),
  unit text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists services_workspace_idx on public.services (workspace_id);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- null = applies to every service in the workspace
  service_id uuid references public.services (id) on delete cascade,
  name text not null,
  rule_type text not null check (rule_type in ('fixed', 'per_unit', 'percentage', 'minimum', 'location_surcharge', 'addon')),
  amount numeric(12, 2) not null,
  per_unit boolean not null default false,
  condition_key text check (condition_key in ('urgency', 'location', 'option')),
  condition_value text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pricing_rules_workspace_idx on public.pricing_rules (workspace_id);
create index if not exists pricing_rules_service_idx on public.pricing_rules (service_id);

-- ---------------------------------------------------------------------------
-- CRM: customers, leads, quotes, line items, files, activity.
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_workspace_idx on public.customers (workspace_id);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  customer_name text not null,
  phone text,
  email text,
  project_description text,
  location text,
  quantity numeric(12, 2),
  unit text,
  urgency text not null default 'standard' check (urgency in ('standard', 'urgent')),
  options text[] not null default '{}',
  ai_summary text,
  conversation jsonb not null default '[]'::jsonb,
  estimated_total numeric(12, 2),
  currency text not null default 'ILS',
  status text not null default 'new' check (status in ('new', 'qualified', 'quote_sent', 'won', 'lost')),
  source text not null default 'public_page',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_workspace_idx on public.leads (workspace_id, created_at desc);
create index if not exists leads_customer_idx on public.leads (customer_id);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  quote_number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  subtotal numeric(12, 2) not null default 0,
  modifiers_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency text not null default 'ILS',
  notes text,
  project_summary text,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  public_token text not null unique,
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, quote_number)
);
create index if not exists quotes_workspace_idx on public.quotes (workspace_id, created_at desc);
create index if not exists quotes_customer_idx on public.quotes (customer_id);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  kind text not null check (kind in ('base', 'addon', 'modifier', 'surcharge', 'minimum')),
  label text not null,
  description text,
  quantity numeric(12, 2),
  unit text,
  unit_amount numeric(12, 2),
  amount numeric(12, 2) not null,
  rule_id uuid references public.pricing_rules (id) on delete set null,
  sort_order integer not null default 0
);
create index if not exists quote_items_quote_idx on public.quote_items (quote_id);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  kind text not null default 'photo' check (kind in ('photo', 'document', 'reference')),
  uploaded_by text not null default 'customer' check (uploaded_by in ('customer', 'member')),
  created_at timestamptz not null default now()
);
create index if not exists uploaded_files_lead_idx on public.uploaded_files (lead_id);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null,
  entity_type text,
  entity_id uuid,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists activities_workspace_idx on public.activities (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security.
-- ---------------------------------------------------------------------------

-- Membership check used by every policy. SECURITY DEFINER so the policy on
-- workspace_members itself does not recurse.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.company_settings enable row level security;
alter table public.services enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.activities enable row level security;

-- users: a person sees and edits only their own profile.
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users for select using (id = auth.uid());
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users for update using (id = auth.uid());

-- workspaces: members read; the owner creates and edits.
drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces for select using (owner_id = auth.uid() or public.is_workspace_member(id));
drop policy if exists workspaces_owner_insert on public.workspaces;
create policy workspaces_owner_insert on public.workspaces for insert with check (owner_id = auth.uid());
drop policy if exists workspaces_member_update on public.workspaces;
create policy workspaces_member_update on public.workspaces for update using (public.is_workspace_member(id));

-- workspace_members: members see the roster; a user can add themselves as
-- the owner of a workspace they own (the onboarding step).
drop policy if exists members_select on public.workspace_members;
create policy members_select on public.workspace_members for select using (public.is_workspace_member(workspace_id));
drop policy if exists members_insert_owner on public.workspace_members;
create policy members_insert_owner on public.workspace_members for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

-- Every other business table: full access for workspace members, nothing else.
do $$
declare
  t text;
begin
  foreach t in array array[
    'company_settings', 'services', 'pricing_rules', 'customers', 'leads',
    'quotes', 'quote_items', 'uploaded_files', 'activities'
  ]
  loop
    execute format('drop policy if exists %I_member_all on public.%I', t, t);
    execute format(
      'create policy %I_member_all on public.%I for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))',
      t, t
    );
  end loop;
end $$;

-- Grants (Supabase applies these by default for the public schema; stated
-- explicitly so the embedded database behaves the same way).
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
