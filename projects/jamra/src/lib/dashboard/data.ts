import 'server-only';
import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/server';
import type { DashboardStats, DeliveryZone, MenuItem, Order, Settings, Category } from '@/lib/types';

export const PAGE_SIZE = 50;

export type OwnerClient = NonNullable<Awaited<ReturnType<typeof createSessionClient>>>;

/**
 * Signed-in owner or a redirect. The proxy already redirects anonymous
 * visitors; this is the authoritative check (a row in public.owners).
 */
export async function requireOwner(): Promise<{ supabase: OwnerClient; email: string | null; isOwner: boolean }> {
  const supabase = await createSessionClient();
  if (!supabase) redirect('/dashboard/demo');
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/dashboard/login');
  const { data: owner } = await supabase.from('owners').select('user_id').eq('user_id', data.user.id).maybeSingle();
  return { supabase, email: data.user.email ?? null, isOwner: Boolean(owner) };
}

const ORDER_COLUMNS =
  'id, order_number, status, locale, fulfillment, payment_method, customer_name, customer_phone, address, landmark, notes, zone_id, zone_name, eta_minutes, items, subtotal, delivery_fee, total, created_at';

const n = (v: unknown) => Number(v);

export async function fetchStats(supabase: OwnerClient): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('owner_dashboard_stats');
  if (error) throw new Error(`owner_dashboard_stats: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return {
    month_start: String(row.month_start),
    orders_count: n(row.orders_count),
    pending_count: n(row.pending_count),
    cancelled_count: n(row.cancelled_count),
    revenue: n(row.revenue),
    food_subtotal: n(row.food_subtotal),
    commission_rate: n(row.commission_rate),
    wolt_savings_estimate: n(row.wolt_savings_estimate),
    today_count: n(row.today_count),
    today_revenue: n(row.today_revenue),
  };
}

/** Newest first, 50 per page. */
export async function fetchOrders(supabase: OwnerClient, page: number): Promise<{ orders: Order[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE);
  if (error) throw new Error(`orders: ${error.message}`);
  const rows = (data ?? []).map((o) => ({
    ...o,
    order_number: n(o.order_number),
    subtotal: n(o.subtotal),
    delivery_fee: n(o.delivery_fee),
    total: n(o.total),
  })) as Order[];
  return { orders: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

/** The owner sees inactive rows too (RLS owner policy). */
export async function fetchMenuAdmin(supabase: OwnerClient): Promise<{ categories: Category[]; items: MenuItem[] }> {
  const [c, i] = await Promise.all([
    supabase.from('categories').select('id, slug, name, sort_order, active').order('sort_order'),
    supabase.from('menu_items').select('id, category_id, slug, name, description, price, image_path, options, is_sold_out, active, sort_order').order('sort_order'),
  ]);
  if (c.error ?? i.error) throw new Error(`menu: ${(c.error ?? i.error)!.message}`);
  return {
    categories: (c.data ?? []) as Category[],
    items: (i.data ?? []).map((x) => ({ ...x, price: n(x.price) })) as MenuItem[],
  };
}

export async function fetchZonesAdmin(supabase: OwnerClient): Promise<DeliveryZone[]> {
  const { data, error } = await supabase.from('delivery_zones').select('id, slug, name, fee, eta_minutes, min_order, active, sort_order').order('sort_order');
  if (error) throw new Error(`zones: ${error.message}`);
  return (data ?? []).map((z) => ({ ...z, fee: n(z.fee), min_order: n(z.min_order) })) as DeliveryZone[];
}

export async function fetchSettings(supabase: OwnerClient): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .select('whatsapp_number, opening_hours, accepting_orders, commission_rate, pickup_eta_minutes, currency')
    .single();
  if (error) throw new Error(`settings: ${error.message}`);
  return { ...(data as Settings), commission_rate: n(data.commission_rate) };
}
