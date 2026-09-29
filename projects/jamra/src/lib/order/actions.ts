'use server';

import { headers } from 'next/headers';
import { placeOrder, type SubmitResult } from '@/lib/order/place-order';

/** Checkout submit. Returns the server receipt; the client then opens WhatsApp. */
export async function submitOrder(raw: unknown): Promise<SubmitResult> {
  const h = await headers();
  return placeOrder(raw, h.get('x-forwarded-for'), new Date());
}
