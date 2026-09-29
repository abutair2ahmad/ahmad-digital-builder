import { cacheLife, cacheTag } from 'next/cache';
import { SEED } from '@/lib/data/seed';
import { createPublicClient } from '@/lib/supabase/public';
import type { Category, DeliveryZone, MenuData, MenuItem, Settings } from '@/lib/types';

export const MENU_TAG = 'menu';

/**
 * The whole public menu in one cached read. Dashboard saves call
 * updateTag(MENU_TAG). Without Supabase env it returns the seed.
 */
export async function getMenu(): Promise<MenuData> {
  'use cache';
  cacheTag(MENU_TAG);
  cacheLife('hours');

  const supabase = createPublicClient();
  if (!supabase) return SEED;

  // RLS already hides inactive rows from anon; the filters make intent explicit.
  const [categories, items, zones, settings] = await Promise.all([
    supabase.from('categories').select('id, slug, name, sort_order, active').eq('active', true).order('sort_order'),
    supabase
      .from('menu_items')
      .select('id, category_id, slug, name, description, price, image_path, options, is_sold_out, active, sort_order')
      .eq('active', true)
      .order('sort_order'),
    supabase.from('delivery_zones').select('id, slug, name, fee, eta_minutes, min_order, active, sort_order').eq('active', true).order('sort_order'),
    supabase.from('settings').select('whatsapp_number, opening_hours, accepting_orders, commission_rate, pickup_eta_minutes, currency').single(),
  ]);
  const error = categories.error ?? items.error ?? zones.error ?? settings.error;
  if (error) throw new Error(`getMenu: ${error.message}`);

  return {
    categories: (categories.data ?? []) as Category[],
    items: (items.data ?? []).map((i) => ({ ...i, price: Number(i.price) }) as MenuItem),
    zones: (zones.data ?? []).map((z) => ({ ...z, fee: Number(z.fee), min_order: Number(z.min_order) }) as DeliveryZone),
    settings: {
      ...(settings.data as Settings),
      commission_rate: Number(settings.data!.commission_rate),
    },
  };
}

/** Categories with their items, in menu order, empty categories dropped. */
export function groupMenu(menu: MenuData) {
  return [...menu.categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => ({
      category,
      items: menu.items.filter((i) => i.category_id === category.id).sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((g) => g.items.length > 0);
}
