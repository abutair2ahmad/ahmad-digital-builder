-- DESTRUCTIVE: drops every JAMRA table and all orders in them.
drop function if exists public.owner_dashboard_stats();
drop function if exists public.place_order(jsonb);
drop function if exists public.order_receipt(public.orders);
drop table if exists public.orders;
drop table if exists public.menu_items;
drop table if exists public.categories;
drop table if exists public.delivery_zones;
drop table if exists public.settings;
drop table if exists public.owners;
drop function if exists public.is_owner();
drop function if exists public.is_open_at(jsonb, timestamp);
drop function if exists public.opening_hours_ok(jsonb);
drop function if exists public.menu_options_ok(jsonb);
drop function if exists public.try_uuid(text);
drop function if exists public.i18n_ok(jsonb, integer);
drop function if exists public.set_updated_at();
