-- ============================================================================
-- JAMRA — single-restaurant schema (fictional brand, portfolio project)
--
-- Visitors (anon) read the active menu, delivery zones and public settings.
-- Orders are written ONLY through public.place_order(), executable by
-- service_role only, which recomputes every price from the database.
-- The single owner is a row in public.owners (inserted by hand, never via API).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- {"ar": "...", "he": "...", "en": "..."} with every value a non-empty string.
-- coalesce(..., false) matters: a NULL result would make a CHECK pass.
create or replace function public.i18n_ok(j jsonb, max_len integer default 200)
returns boolean
language sql
immutable
as $$
  select coalesce(
    jsonb_typeof(j) = 'object'
    and jsonb_typeof(j -> 'ar') = 'string' and length(btrim(j ->> 'ar')) between 1 and max_len
    and jsonb_typeof(j -> 'he') = 'string' and length(btrim(j ->> 'he')) between 1 and max_len
    and jsonb_typeof(j -> 'en') = 'string' and length(btrim(j ->> 'en')) between 1 and max_len,
    false
  );
$$;

create or replace function public.try_uuid(t text)
returns uuid
language sql
immutable
as $$
  select case
    when t ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then t::uuid
  end;
$$;

-- Option groups on a menu item:
-- [{ "id": "size", "label": I18n, "type": "single"|"multi", "required": bool,
--    "max"?: int, "choices": [{ "id": "large", "label": I18n, "price_delta": 8 }] }]
create or replace function public.menu_options_ok(o jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  g jsonb;
  c jsonb;
  gids text[] := '{}';
  cids text[];
begin
  if jsonb_typeof(o) is distinct from 'array' or jsonb_array_length(o) > 10 then
    return false;
  end if;
  for g in select value from jsonb_array_elements(o) loop
    if jsonb_typeof(g) is distinct from 'object'
      or jsonb_typeof(g -> 'id') is distinct from 'string'
      or (g ->> 'id') !~ '^[a-z0-9_-]{1,40}$'
      or (g ->> 'id') = any (gids)
      or not public.i18n_ok(g -> 'label', 80)
      or coalesce(g ->> 'type', '') not in ('single', 'multi')
      or jsonb_typeof(g -> 'required') is distinct from 'boolean'
      or jsonb_typeof(g -> 'choices') is distinct from 'array'
      or jsonb_array_length(g -> 'choices') not between 1 and 20
    then
      return false;
    end if;
    if g ? 'max' and (
      jsonb_typeof(g -> 'max') is distinct from 'number'
      or (g ->> 'max')::numeric < 1
      or (g ->> 'max')::numeric <> trunc((g ->> 'max')::numeric)
    ) then
      return false;
    end if;
    gids := gids || (g ->> 'id');
    cids := '{}';
    for c in select value from jsonb_array_elements(g -> 'choices') loop
      if jsonb_typeof(c) is distinct from 'object'
        or jsonb_typeof(c -> 'id') is distinct from 'string'
        or (c ->> 'id') !~ '^[a-z0-9_-]{1,40}$'
        or (c ->> 'id') = any (cids)
        or not public.i18n_ok(c -> 'label', 80)
        or jsonb_typeof(c -> 'price_delta') is distinct from 'number'
        or (c ->> 'price_delta')::numeric not between 0 and 1000
        or (c ->> 'price_delta')::numeric <> round((c ->> 'price_delta')::numeric, 2)
      then
        return false;
      end if;
      cids := cids || (c ->> 'id');
    end loop;
  end loop;
  return true;
end;
$$;

-- Opening hours: keys "0".."6" = extract(dow) (0 = Sunday). A missing day is
-- closed. Each range is ["HH:MM","HH:MM"]; close <= open means it runs past
-- midnight (["18:00","02:00"]), ["00:00","00:00"] means all day.
create or replace function public.opening_hours_ok(h jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(
    jsonb_typeof(h) = 'object'
    and not exists (
      select 1 from jsonb_each(h) d(k, v)
      where d.k not in ('0', '1', '2', '3', '4', '5', '6')
        or jsonb_typeof(d.v) <> 'array'
        or jsonb_array_length(d.v) > 4
        or exists (
          select 1 from jsonb_array_elements(d.v) r(x)
          where jsonb_typeof(r.x) <> 'array'
            or jsonb_array_length(r.x) <> 2
            or coalesce(r.x ->> 0, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            or coalesce(r.x ->> 1, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        )
    ),
    false
  );
$$;

-- t is local wall-clock time (Asia/Jerusalem), not timestamptz.
create or replace function public.is_open_at(h jsonb, t timestamp)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(h -> extract(dow from t)::int::text, '[]')) r(x)
    where ((r.x ->> 0)::time < (r.x ->> 1)::time
           and t::time >= (r.x ->> 0)::time and t::time < (r.x ->> 1)::time)
       or ((r.x ->> 1)::time <= (r.x ->> 0)::time and t::time >= (r.x ->> 0)::time)
  ) or exists (
    select 1 from jsonb_array_elements(coalesce(h -> extract(dow from t - interval '1 day')::int::text, '[]')) r(x)
    where (r.x ->> 1)::time <= (r.x ->> 0)::time and t::time < (r.x ->> 1)::time
  );
$$;

-- ---------------------------------------------------------------------------
-- Owner identification
-- ---------------------------------------------------------------------------
create table if not exists public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.owners o where o.user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Settings (singleton row)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id boolean primary key default true check (id),
  -- digits only, the format wa.me expects (e.g. 9725XXXXXXXX)
  whatsapp_number text not null check (whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  opening_hours jsonb not null default '{}'::jsonb check (public.opening_hours_ok(opening_hours)),
  accepting_orders boolean not null default false,
  commission_rate numeric(4, 3) not null default 0.270 check (commission_rate >= 0 and commission_rate < 1),
  -- ETA quoted for pickup orders (no zone, no fee, no minimum)
  pickup_eta_minutes integer not null default 20 check (pickup_eta_minutes between 5 and 240),
  currency text not null default 'ILS' check (currency = 'ILS'),
  updated_at timestamptz not null default now()
);

-- Closed by default: nothing is accepted until the owner sets a real number
-- and opens ordering from the dashboard.
insert into public.settings (id, whatsapp_number, accepting_orders)
values (true, '972500000000', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name jsonb not null check (public.i18n_ok(name, 80)),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name jsonb not null check (public.i18n_ok(name, 120)),
  description jsonb check (description is null or public.i18n_ok(description, 600)),
  price numeric(10, 2) not null check (price between 0 and 10000),
  image_path text check (image_path is null or length(image_path) <= 300),
  options jsonb not null default '[]'::jsonb check (public.menu_options_ok(options)),
  is_sold_out boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_items_category_idx on public.menu_items (category_id, sort_order);

-- ---------------------------------------------------------------------------
-- Delivery zones
-- ---------------------------------------------------------------------------
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name jsonb not null check (public.i18n_ok(name, 80)),
  fee numeric(10, 2) not null default 0 check (fee between 0 and 500),
  eta_minutes integer not null check (eta_minutes between 5 and 240),
  min_order numeric(10, 2) not null default 0 check (min_order between 0 and 5000),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders — immutable snapshot; only status changes after insert.
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  idempotency_key uuid not null unique,
  status text not null default 'new' check (status in ('new', 'confirmed', 'delivered', 'cancelled')),
  locale text not null check (locale in ('ar', 'he', 'en')),
  fulfillment text not null check (fulfillment in ('delivery', 'pickup')),
  -- paid on delivery / at pickup; nothing is charged online
  payment_method text not null check (payment_method in ('cash', 'card', 'bit')),
  customer_name text not null check (length(btrim(customer_name)) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^\+[1-9][0-9]{7,14}$'),
  address text check (address is null or length(btrim(address)) between 5 and 300),
  landmark text check (landmark is null or length(landmark) <= 120),
  notes text check (notes is null or length(notes) <= 500),
  zone_id uuid references public.delivery_zones (id) on delete set null,
  zone_name jsonb,
  eta_minutes integer not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 30),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total = subtotal + delivery_fee),
  -- sha256(salt + client IP), computed by the server; used only for rate limits
  client_key text check (client_key is null or client_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Delivery needs a zone snapshot and an address. Pickup has neither, and no
  -- fee. zone_id is not checked: deleting a zone sets it to null on old orders.
  constraint orders_fulfillment_shape check (
    (fulfillment = 'delivery' and zone_name is not null and address is not null)
    or (fulfillment = 'pickup' and zone_id is null and zone_name is null
        and address is null and landmark is null and delivery_fee = 0)
  )
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_phone_created_idx on public.orders (customer_phone, created_at desc);
create index if not exists orders_client_key_created_idx on public.orders (client_key, created_at desc)
  where client_key is not null;

-- updated_at triggers
do $$
declare
  t text;
begin
  foreach t in array array['settings', 'categories', 'menu_items', 'delivery_zones', 'orders'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- place_order: the only write path for anonymous customers.
-- ---------------------------------------------------------------------------
create or replace function public.order_receipt(o public.orders)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'locale', o.locale,
    'fulfillment', o.fulfillment,
    'payment_method', o.payment_method,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'address', o.address,
    'landmark', o.landmark,
    'notes', o.notes,
    'zone_name', o.zone_name,
    'eta_minutes', o.eta_minutes,
    'items', o.items,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'created_at', o.created_at,
    'whatsapp_number', (select s.whatsapp_number from public.settings s where s.id)
  );
$$;

create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key uuid;
  v_order public.orders%rowtype;
  v_settings public.settings%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_locale text;
  v_fulfillment text;
  v_payment text;
  v_name text;
  v_phone text;
  v_address text;
  v_landmark text;
  v_notes text;
  v_fee numeric(10, 2);
  v_eta integer;
  v_client_key text;
  v_line jsonb;
  v_item_id uuid;
  v_item public.menu_items%rowtype;
  v_qty integer;
  v_total_qty integer := 0;
  v_sel jsonb;
  v_group jsonb;
  v_picked jsonb;
  v_choice jsonb;
  v_choice_id text;
  v_opts jsonb;
  v_unit numeric(10, 2);
  v_line_note text;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric(10, 2) := 0;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or length(payload::text) > 20000 then
    raise exception 'INVALID_PAYLOAD';
  end if;

  -- 1. Idempotency: a retried submit returns the original order.
  v_key := public.try_uuid(payload ->> 'idempotency_key');
  if v_key is null then
    raise exception 'INVALID_PAYLOAD' using detail = 'idempotency_key';
  end if;
  select * into v_order from public.orders where idempotency_key = v_key;
  if found then
    return public.order_receipt(v_order);
  end if;

  -- 2. Open for orders?
  select * into v_settings from public.settings where id;
  if not found or not v_settings.accepting_orders then
    raise exception 'NOT_ACCEPTING';
  end if;
  if not public.is_open_at(v_settings.opening_hours, (now() at time zone 'Asia/Jerusalem')) then
    raise exception 'CLOSED';
  end if;

  -- 3. Customer fields (phone arrives already normalised to E.164 by the server).
  v_locale := payload ->> 'locale';
  if v_locale is null or v_locale not in ('ar', 'he', 'en') then
    raise exception 'INVALID_PAYLOAD' using detail = 'locale';
  end if;
  v_fulfillment := payload ->> 'fulfillment';
  if v_fulfillment is null or v_fulfillment not in ('delivery', 'pickup') then
    raise exception 'INVALID_PAYLOAD' using detail = 'fulfillment';
  end if;
  v_payment := payload ->> 'payment_method';
  if v_payment is null or v_payment not in ('cash', 'card', 'bit') then
    raise exception 'INVALID_PAYLOAD' using detail = 'payment_method';
  end if;
  v_name := btrim(payload #>> '{customer,name}');
  v_phone := payload #>> '{customer,phone}';
  v_notes := nullif(btrim(payload #>> '{customer,notes}'), '');
  -- Address and landmark exist only for delivery; pickup drops whatever was typed.
  if v_fulfillment = 'delivery' then
    v_address := btrim(payload #>> '{customer,address}');
    v_landmark := nullif(btrim(payload #>> '{customer,landmark}'), '');
  end if;
  if v_name is null or length(v_name) not between 2 and 80
    or (v_fulfillment = 'delivery' and (v_address is null or length(v_address) not between 5 and 300))
    or (v_landmark is not null and length(v_landmark) > 120)
    or (v_notes is not null and length(v_notes) > 500)
  then
    raise exception 'INVALID_CUSTOMER';
  end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'INVALID_PHONE';
  end if;
  v_client_key := payload ->> 'client_key';
  if v_client_key is not null and v_client_key !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_PAYLOAD' using detail = 'client_key';
  end if;

  -- 4. Rate limits. The advisory lock serialises concurrent orders per phone.
  perform pg_advisory_xact_lock(hashtextextended('jamra:order:' || v_phone, 0));
  if (select count(*) from public.orders o
      where o.customer_phone = v_phone and o.created_at > now() - interval '10 minutes') >= 3
    or (select count(*) from public.orders o
      where o.customer_phone = v_phone and o.created_at > now() - interval '24 hours') >= 10
  then
    raise exception 'RATE_LIMITED';
  end if;
  if v_client_key is not null and (
    select count(*) from public.orders o
    where o.client_key = v_client_key and o.created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'RATE_LIMITED';
  end if;
  -- Global brake against floods from many IPs/phones (well above a real restaurant's peak).
  if (select count(*) from public.orders o where o.created_at > now() - interval '10 minutes') >= 120 then
    raise exception 'BUSY';
  end if;

  -- 5. Zone (delivery only). Pickup: no fee, no minimum, the settings ETA.
  if v_fulfillment = 'delivery' then
    select * into v_zone from public.delivery_zones z
    where z.id = public.try_uuid(payload ->> 'zone_id') and z.active;
    if not found then
      raise exception 'ZONE_UNAVAILABLE';
    end if;
    v_fee := v_zone.fee;
    v_eta := v_zone.eta_minutes;
  else
    v_fee := 0;
    v_eta := v_settings.pickup_eta_minutes;
  end if;

  -- 6. Lines: every price comes from the database, never from the payload.
  if jsonb_typeof(payload -> 'items') is distinct from 'array'
    or jsonb_array_length(payload -> 'items') not between 1 and 30
  then
    raise exception 'INVALID_PAYLOAD' using detail = 'items';
  end if;

  for v_line in select value from jsonb_array_elements(payload -> 'items') loop
    v_item_id := public.try_uuid(v_line ->> 'item_id');
    if v_item_id is null
      or jsonb_typeof(v_line -> 'qty') is distinct from 'number'
      or (v_line ->> 'qty') !~ '^[0-9]{1,2}$'
    then
      raise exception 'INVALID_PAYLOAD' using detail = 'items';
    end if;
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty not between 1 and 20 then
      raise exception 'INVALID_PAYLOAD' using detail = 'qty';
    end if;
    v_total_qty := v_total_qty + v_qty;
    if v_total_qty > 50 then
      raise exception 'TOO_MANY_ITEMS';
    end if;

    select mi.* into v_item
    from public.menu_items mi
    where mi.id = v_item_id
      and mi.active
      and exists (select 1 from public.categories c where c.id = mi.category_id and c.active);
    if not found then
      raise exception 'ITEM_UNAVAILABLE' using detail = v_item_id::text;
    end if;
    if v_item.is_sold_out then
      raise exception 'ITEM_SOLD_OUT' using detail = v_item_id::text;
    end if;

    v_line_note := nullif(btrim(v_line ->> 'note'), '');
    if v_line_note is not null and length(v_line_note) > 140 then
      raise exception 'INVALID_PAYLOAD' using detail = 'note';
    end if;

    -- Options: { "<group_id>": "<choice_id>" | ["<choice_id>", ...] }
    v_sel := coalesce(v_line -> 'options', '{}'::jsonb);
    if jsonb_typeof(v_sel) <> 'object' then
      raise exception 'INVALID_OPTIONS' using detail = v_item_id::text;
    end if;
    if exists (
      select 1 from jsonb_object_keys(v_sel) k
      where not exists (
        select 1 from jsonb_array_elements(v_item.options) g where g ->> 'id' = k
      )
    ) then
      raise exception 'INVALID_OPTIONS' using detail = v_item_id::text;
    end if;

    v_unit := v_item.price;
    v_opts := '[]'::jsonb;
    for v_group in select value from jsonb_array_elements(v_item.options) loop
      v_picked := v_sel -> (v_group ->> 'id');
      if v_picked is null or v_picked = 'null'::jsonb or v_picked = '[]'::jsonb then
        if (v_group ->> 'required')::boolean then
          raise exception 'INVALID_OPTIONS' using detail = v_item_id::text;
        end if;
        continue;
      end if;

      if v_group ->> 'type' = 'single' then
        if jsonb_typeof(v_picked) <> 'string' then
          raise exception 'INVALID_OPTIONS' using detail = v_item_id::text;
        end if;
        v_picked := jsonb_build_array(v_picked);
      elsif jsonb_typeof(v_picked) <> 'array'
        or jsonb_array_length(v_picked) > coalesce((v_group ->> 'max')::numeric, jsonb_array_length(v_group -> 'choices'))
        or (select count(distinct e) from jsonb_array_elements(v_picked) a(e)) <> jsonb_array_length(v_picked)
      then
        raise exception 'INVALID_OPTIONS' using detail = v_item_id::text;
      end if;

      for v_choice_id in select jsonb_array_elements_text(v_picked) loop
        select ch.x into v_choice
        from jsonb_array_elements(v_group -> 'choices') ch(x)
        where ch.x ->> 'id' = v_choice_id;
        if not found then
          raise exception 'INVALID_OPTIONS' using detail = v_item_id::text;
        end if;
        v_unit := v_unit + (v_choice ->> 'price_delta')::numeric;
        v_opts := v_opts || jsonb_build_array(jsonb_build_object(
          'group_id', v_group ->> 'id',
          'group', v_group -> 'label',
          'choice_id', v_choice_id,
          'label', v_choice -> 'label',
          'price_delta', (v_choice ->> 'price_delta')::numeric
        ));
      end loop;
    end loop;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'item_id', v_item.id,
      'name', v_item.name,
      'qty', v_qty,
      'unit_price', v_unit,
      'options', v_opts,
      'note', v_line_note,
      'line_total', v_unit * v_qty
    ));
    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  -- 7. Zone minimum (on the food subtotal, before the delivery fee). v_zone
  --    is all nulls for pickup, so the comparison is null and never raises.
  if v_fulfillment = 'delivery' and v_subtotal < v_zone.min_order then
    raise exception 'BELOW_MINIMUM' using detail = v_zone.min_order::text;
  end if;

  -- 8. Insert. A concurrent retry with the same key loses the unique race and
  --    returns the order that won.
  begin
    insert into public.orders (
      idempotency_key, locale, fulfillment, payment_method, customer_name, customer_phone,
      address, landmark, notes, zone_id, zone_name, eta_minutes, items, subtotal,
      delivery_fee, total, client_key
    ) values (
      v_key, v_locale, v_fulfillment, v_payment, v_name, v_phone,
      v_address, v_landmark, v_notes, v_zone.id, v_zone.name, v_eta, v_lines, v_subtotal,
      v_fee, v_subtotal + v_fee, v_client_key
    )
    returning * into v_order;
  exception when unique_violation then
    select * into v_order from public.orders where idempotency_key = v_key;
  end;

  return public.order_receipt(v_order);
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard stats (security invoker: RLS applies, non-owners get zeros).
-- Month and day boundaries are Asia/Jerusalem wall-clock, DST-safe.
-- Revenue and savings count confirmed + delivered only; 'new' is unverified.
-- ---------------------------------------------------------------------------
create or replace function public.owner_dashboard_stats()
returns table (
  month_start timestamptz,
  orders_count bigint,
  pending_count bigint,
  cancelled_count bigint,
  revenue numeric,
  food_subtotal numeric,
  commission_rate numeric,
  wolt_savings_estimate numeric,
  today_count bigint,
  today_revenue numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with b as (
    select
      date_trunc('month', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem' as m0,
      (date_trunc('month', now() at time zone 'Asia/Jerusalem') + interval '1 month') at time zone 'Asia/Jerusalem' as m1,
      date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem' as d0
  ),
  m as (
    select o.status, o.subtotal, o.total, o.created_at
    from public.orders o, b
    where o.created_at >= b.m0 and o.created_at < b.m1
  )
  select
    b.m0,
    count(m.*) filter (where m.status in ('confirmed', 'delivered')),
    count(m.*) filter (where m.status = 'new'),
    count(m.*) filter (where m.status = 'cancelled'),
    coalesce(sum(m.total) filter (where m.status in ('confirmed', 'delivered')), 0),
    coalesce(sum(m.subtotal) filter (where m.status in ('confirmed', 'delivered')), 0),
    s.commission_rate,
    round(coalesce(sum(m.subtotal) filter (where m.status in ('confirmed', 'delivered')), 0) * s.commission_rate, 2),
    count(m.*) filter (where m.created_at >= b.d0 and m.status in ('confirmed', 'delivered')),
    coalesce(sum(m.total) filter (where m.created_at >= b.d0 and m.status in ('confirmed', 'delivered')), 0)
  from b
  cross join public.settings s
  left join m on true
  where s.id
  group by b.m0, s.commission_rate;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.owners enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;

-- owners: a signed-in user can see only their own row. No write policy:
-- the owner row is inserted from the SQL editor, never through the API.
drop policy if exists owners_self_select on public.owners;
create policy owners_self_select on public.owners
  for select to authenticated using (user_id = (select auth.uid()));

-- settings: public read (WhatsApp number and hours are needed by visitors);
-- only the owner updates. No insert/delete: the singleton is seeded above.
drop policy if exists settings_public_select on public.settings;
create policy settings_public_select on public.settings
  for select to anon, authenticated using (true);
drop policy if exists settings_owner_update on public.settings;
create policy settings_owner_update on public.settings
  for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- Menu and zones: anyone reads active rows (an item also needs an active
-- category); the owner reads and writes all.
drop policy if exists categories_public_select on public.categories;
create policy categories_public_select on public.categories
  for select to anon, authenticated using (active);
drop policy if exists delivery_zones_public_select on public.delivery_zones;
create policy delivery_zones_public_select on public.delivery_zones
  for select to anon, authenticated using (active);
drop policy if exists menu_items_public_select on public.menu_items;
create policy menu_items_public_select on public.menu_items
  for select to anon, authenticated using (
    active and exists (
      select 1 from public.categories c where c.id = category_id and c.active
    )
  );

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'menu_items', 'delivery_zones'] loop
    execute format('drop policy if exists %I_owner_all on public.%I', t, t);
    execute format(
      'create policy %I_owner_all on public.%I for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))',
      t, t
    );
  end loop;
end $$;

-- orders: owner only. No insert policy (place_order bypasses RLS as the table
-- owner), no delete policy (cancel instead).
drop policy if exists orders_owner_select on public.orders;
create policy orders_owner_select on public.orders
  for select to authenticated using ((select public.is_owner()));
drop policy if exists orders_owner_update on public.orders;
create policy orders_owner_update on public.orders
  for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- ---------------------------------------------------------------------------
-- Grants. Supabase's default privileges grant everything in `public` to anon
-- and authenticated; RLS is the gate, and these revokes are the second lock.
-- ---------------------------------------------------------------------------
revoke all on public.owners, public.settings, public.categories, public.menu_items,
  public.delivery_zones, public.orders from anon, authenticated;

grant select on public.settings, public.categories, public.menu_items, public.delivery_zones to anon;

grant select on public.owners to authenticated;
grant select, update on public.settings to authenticated;
grant select, insert, update, delete on public.categories, public.menu_items, public.delivery_zones to authenticated;
-- The owner may change only the status of an order; the snapshot is immutable.
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

grant all on public.owners, public.settings, public.categories, public.menu_items,
  public.delivery_zones, public.orders to service_role;

-- Functions: Postgres grants EXECUTE to PUBLIC by default and Supabase adds
-- anon/authenticated. Revoke everything, then grant what each role needs.
revoke execute on function
  public.set_updated_at(),
  public.i18n_ok(jsonb, integer),
  public.try_uuid(text),
  public.menu_options_ok(jsonb),
  public.opening_hours_ok(jsonb),
  public.is_open_at(jsonb, timestamp),
  public.is_owner(),
  public.order_receipt(public.orders),
  public.place_order(jsonb),
  public.owner_dashboard_stats()
from public, anon, authenticated;

-- CHECK constraints run with the caller's privileges: the owner's writes need these.
grant execute on function
  public.i18n_ok(jsonb, integer),
  public.menu_options_ok(jsonb),
  public.opening_hours_ok(jsonb),
  public.is_owner(),
  public.owner_dashboard_stats()
to authenticated;

grant execute on function public.place_order(jsonb) to service_role;
