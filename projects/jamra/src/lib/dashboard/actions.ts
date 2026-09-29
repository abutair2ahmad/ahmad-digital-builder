'use server';

import { refresh, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { MENU_TAG } from '@/lib/data/menu';
import { createSessionClient } from '@/lib/supabase/server';

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_ALLOWED = 'لازم تكون مسجّل دخول كصاحب المطعم.';
const SAVE_FAILED = 'ما قدرنا نحفظ التغيير، جرّب كمان مرة.';
const INVALID = 'القيمة مش صحيحة.';

/** Session client for a signed-in owner, or null. RLS enforces the rest. */
async function ownerClient() {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: owner } = await supabase.from('owners').select('user_id').eq('user_id', data.user.id).maybeSingle();
  return owner ? supabase : null;
}

// --- auth ----------------------------------------------------------------------

export async function signIn(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await createSessionClient();
  if (!supabase) return { ok: false, error: 'Supabase مش مضبوط.' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { ok: false, error: 'اكتب الإيميل وكلمة السر.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'الإيميل أو كلمة السر غلط.' };
  redirect('/dashboard/orders');
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect('/dashboard/login');
}

// --- orders ------------------------------------------------------------------

const statusSchema = z.object({ id: z.uuid(), status: z.enum(['new', 'confirmed', 'delivered', 'cancelled']) });

/** Only the status column is writable (column grant); the snapshot is immutable. */
export async function setOrderStatus(id: string, status: string): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: INVALID };
  const supabase = await ownerClient();
  if (!supabase) return { ok: false, error: NOT_ALLOWED };
  const { error } = await supabase.from('orders').update({ status: parsed.data.status }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: SAVE_FAILED };
  refresh();
  return { ok: true };
}

// --- menu, zones, settings (public data: expire the cached menu) --------------

const itemSchema = z.object({
  id: z.uuid(),
  price: z.number().min(0).max(10000).optional(),
  is_sold_out: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function updateMenuItem(input: z.input<typeof itemSchema>): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const supabase = await ownerClient();
  if (!supabase) return { ok: false, error: NOT_ALLOWED };
  const { id, ...patch } = parsed.data;
  const { error } = await supabase.from('menu_items').update(patch).eq('id', id);
  if (error) return { ok: false, error: SAVE_FAILED };
  updateTag(MENU_TAG);
  return { ok: true };
}

const zoneSchema = z.object({
  id: z.uuid(),
  fee: z.number().min(0).max(500).optional(),
  eta_minutes: z.number().int().min(5).max(240).optional(),
  min_order: z.number().min(0).max(5000).optional(),
  active: z.boolean().optional(),
});

export async function updateZone(input: z.input<typeof zoneSchema>): Promise<ActionResult> {
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const supabase = await ownerClient();
  if (!supabase) return { ok: false, error: NOT_ALLOWED };
  const { id, ...patch } = parsed.data;
  const { error } = await supabase.from('delivery_zones').update(patch).eq('id', id);
  if (error) return { ok: false, error: SAVE_FAILED };
  updateTag(MENU_TAG);
  return { ok: true };
}

const hhmm = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
const settingsSchema = z.object({
  whatsapp_number: z.string().regex(/^[1-9][0-9]{7,14}$/),
  accepting_orders: z.boolean(),
  commission_rate: z.number().min(0).max(0.999),
  pickup_eta_minutes: z.number().int().min(5).max(240),
  opening_hours: z.partialRecord(z.enum(['0', '1', '2', '3', '4', '5', '6']), z.array(z.tuple([hhmm, hhmm])).max(4)),
});

export async function updateSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const supabase = await ownerClient();
  if (!supabase) return { ok: false, error: NOT_ALLOWED };
  const { error } = await supabase.from('settings').update(parsed.data).eq('id', true);
  if (error) return { ok: false, error: SAVE_FAILED };
  updateTag(MENU_TAG);
  return { ok: true };
}
