import 'server-only';
import { dataMode, demoWhatsapp, misconfiguration } from '@/lib/config';
import { getMenu } from '@/lib/data/menu';
import { runPlaceOrder, type SubmitResult } from '@/lib/order/flow';
import { createAdminClient } from '@/lib/supabase/admin';

export type { SubmitResult };

/** Wires the order flow to the real menu, env and service-role client. */
export async function placeOrder(raw: unknown, forwardedFor: string | null, now: Date): Promise<SubmitResult> {
  const admin = dataMode() === 'supabase' ? createAdminClient() : null;
  return runPlaceOrder(raw, {
    mode: dataMode(),
    misconfiguration: misconfiguration(),
    getMenu,
    rpc: admin ? async (payload) => admin.rpc('place_order', { payload }) : undefined,
    forwardedFor,
    salt: process.env.ORDER_RATE_SALT,
    demoWhatsapp: demoWhatsapp(),
    now,
  });
}
