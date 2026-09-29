/**
 * The order submit flow, free of Next/server-only imports so it can be tested
 * in both modes. `place-order.ts` wires it to the real menu, env and Supabase.
 *
 * validate (≤16 KB) → honeypot → phone → mode checks → price and save.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DataMode } from '@/lib/config';
import { usableWhatsapp } from '@/lib/order/contact';
import { normalizeIsraeliMobile } from '@/lib/order/phone';
import { priceOrder } from '@/lib/order/pricing';
import { buildWhatsAppMessage, whatsappUrl } from '@/lib/order/whatsapp';
import { ORDER_ERROR_CODES, type MenuData, type OrderErrorCode, type PlaceOrderInput, type Receipt } from '@/lib/types';

export type SubmitResult =
  | { ok: true; receipt: Receipt; message: string; whatsappUrl: string }
  | { ok: false; code: OrderErrorCode; detail?: string };

export interface FlowDeps {
  mode: DataMode;
  /** Non-null when orders must be refused (missing key or salt); logged. */
  misconfiguration: string | null;
  getMenu: () => Promise<MenuData>;
  /** Supabase mode only: calls public.place_order. */
  rpc?: (payload: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; details?: string | null } | null }>;
  forwardedFor: string | null;
  salt: string | undefined;
  /** Demo mode only: where demo orders go. null → wa.me without a number (visitor picks the chat). */
  demoWhatsapp: string | null;
  now: Date;
  log?: (msg: string) => void;
}

const MAX_BYTES = 16 * 1024;
const ALL_DAY = Object.fromEntries(['0', '1', '2', '3', '4', '5', '6'].map((d) => [d, [['00:00', '00:00']]])) as MenuData['settings']['opening_hours'];

const selection = z.record(z.string().max(40), z.union([z.string().max(40), z.array(z.string().max(40)).max(20)]));

export const orderSchema = z.object({
  idempotency_key: z.uuid(),
  locale: z.enum(['ar', 'he', 'en']),
  fulfillment: z.enum(['delivery', 'pickup']),
  payment_method: z.enum(['cash', 'card', 'bit']),
  zone_id: z.string().max(64).nullable(),
  customer: z.object({
    name: z.string().max(200),
    phone: z.string().max(40),
    address: z.string().max(400).optional(),
    landmark: z.string().max(200).optional(),
    notes: z.string().max(600).optional(),
  }),
  items: z
    .array(z.object({ item_id: z.string().max(64), qty: z.number(), options: selection.optional(), note: z.string().max(200).optional() }))
    .min(1)
    .max(30),
  // Honeypot: a hidden field people never fill.
  website: z.string().max(500).optional(),
  // Demo only: "try ordering as if we're open". Ignored in Supabase mode.
  demo_open: z.boolean().optional(),
});

export function clientKey(forwardedFor: string | null, salt: string | undefined): string | null {
  const ip = forwardedFor?.split(',')[0]?.trim();
  if (!ip || !salt) return null;
  return createHash('sha256').update(salt + ip).digest('hex');
}

function codeFrom(message: string | undefined): OrderErrorCode {
  return ORDER_ERROR_CODES.find((c) => c !== 'UNKNOWN' && message?.includes(c)) ?? 'UNKNOWN';
}

const num = (v: unknown) => Number(v);

/** RPC numerics arrive as JSON numbers or strings; normalise every one. */
export function normaliseReceipt(raw: Record<string, unknown>): Receipt {
  const r = raw as unknown as Receipt;
  return {
    ...r,
    order_number: r.order_number === null ? null : num(r.order_number),
    eta_minutes: num(r.eta_minutes),
    subtotal: num(r.subtotal),
    delivery_fee: num(r.delivery_fee),
    total: num(r.total),
    items: r.items.map((l) => ({
      ...l,
      qty: num(l.qty),
      unit_price: num(l.unit_price),
      line_total: num(l.line_total),
      options: l.options.map((o) => ({ ...o, price_delta: num(o.price_delta) })),
    })),
  };
}

/** The placeholder never becomes a link; no usable number → wa.me without a number. */
export function success(receipt: Receipt): SubmitResult {
  const number = usableWhatsapp(receipt.whatsapp_number);
  const fixed = { ...receipt, whatsapp_number: number };
  const message = buildWhatsAppMessage(fixed);
  return { ok: true, receipt: fixed, message, whatsappUrl: whatsappUrl(number, message) };
}

/** Demo pricing: the demo number (or none), and optionally "as if open". */
async function priceDemo(deps: FlowDeps, input: PlaceOrderInput, demoOpen: boolean): Promise<SubmitResult> {
  const menu = await deps.getMenu();
  const settings = demoOpen ? { ...menu.settings, accepting_orders: true, opening_hours: ALL_DAY } : menu.settings;
  const priced = priceOrder({ ...menu, settings }, input, deps.now);
  if (!priced.ok) return { ok: false, code: priced.code, detail: priced.detail };
  return success({ ...priced.value, whatsapp_number: deps.demoWhatsapp });
}

export async function runPlaceOrder(raw: unknown, deps: FlowDeps): Promise<SubmitResult> {
  let size = MAX_BYTES + 1;
  try {
    size = Buffer.byteLength(JSON.stringify(raw) ?? '', 'utf8');
  } catch {
    // unserialisable input stays oversized
  }
  if (size > MAX_BYTES) return { ok: false, code: 'INVALID_PAYLOAD' };

  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: 'INVALID_PAYLOAD' };
  const { website, demo_open: demoOpen, ...rest } = parsed.data;
  const phone = normalizeIsraeliMobile(rest.customer.phone);

  if (website && website.trim() !== '') {
    // Bot: a normal-looking demo receipt so it learns nothing; nothing saved or sent.
    const menu = await deps.getMenu();
    const fake = priceOrder(menu, { ...rest, customer: { ...rest.customer, phone: phone ?? '+972500000001' } }, deps.now);
    return fake.ok ? success({ ...fake.value, whatsapp_number: null }) : { ok: false, code: fake.code, detail: fake.detail };
  }

  if (!phone) return { ok: false, code: 'INVALID_PHONE' };
  const input: PlaceOrderInput = { ...rest, customer: { ...rest.customer, phone } };

  if (deps.misconfiguration) {
    (deps.log ?? console.error)(`[jamra] ${deps.misconfiguration}`);
    return { ok: false, code: 'UNKNOWN' };
  }

  if (deps.mode === 'demo') return priceDemo(deps, input, demoOpen === true);

  // Supabase mode: demo_open is dropped above and never reaches the database.
  if (!deps.rpc) return { ok: false, code: 'UNKNOWN' };
  const { data, error } = await deps.rpc({ ...input, client_key: clientKey(deps.forwardedFor, deps.salt) });
  if (error) {
    const code = codeFrom(error.message);
    if (code === 'UNKNOWN') (deps.log ?? console.error)(`[jamra] place_order failed: ${error.message}`);
    return { ok: false, code, detail: error.details ?? undefined };
  }
  return success(normaliseReceipt(data as Record<string, unknown>));
}
