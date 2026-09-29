import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED } from '@/lib/data/seed';
import { priceOrder } from '@/lib/order/pricing';
import { buildWhatsAppMessage, whatsappUrl } from '@/lib/order/whatsapp';
import type { Locale, PlaceOrderInput, Receipt } from '@/lib/types';

const OPEN = new Date('2026-09-30T12:00:00Z');
const id = (slug: string) => SEED.items.find((i) => i.slug === slug)!.id;

function receipt(locale: Locale, fulfillment: 'delivery' | 'pickup', notes?: string): Receipt {
  const input: PlaceOrderInput = {
    idempotency_key: '00000000-0000-4000-8000-000000000001',
    locale,
    fulfillment,
    payment_method: 'bit',
    zone_id: SEED.zones[0].id,
    customer: { name: 'Sam', phone: '+972501234567', address: 'Main St 1', landmark: 'near the mosque', notes },
    items: [
      { item_id: id('chicken-shawarma-wrap'), qty: 2, options: { spice: 'spicy' } },
      { item_id: id('water'), qty: 1 },
    ],
  };
  const r = priceOrder(SEED, input, OPEN);
  assert.ok(r.ok);
  return r.value;
}

test('ar delivery message', () => {
  const msg = buildWhatsAppMessage({ ...receipt('ar', 'delivery', 'بدون بصل'), order_number: 1042 });
  assert.equal(
    msg,
    [
      '🔥 طلب جديد من جمرة',
      'رقم الطلب: #1042',
      '',
      '📋 الطلب:',
      '2× لفة شاورما دجاج (حار) – ₪48',
      '1× مي معدنية – ₪6',
      '',
      '💰 المجموع الفرعي: ₪54',
      '🚚 رسوم التوصيل: ₪10',
      '🧾 الإجمالي: ₪64',
      '',
      '📍 التوصيل إلى: الناصرة – Main St 1 (near the mosque)',
      '⏱ بيوصل خلال: ~30 دقيقة',
      '👤 الاسم: Sam',
      '📞 الهاتف: 050-1234567',
      '💳 الدفع: Bit (عند الاستلام)',
      '📝 ملاحظات: بدون بصل',
    ].join('\n'),
  );
});

test('ar demo order has no number and omits empty notes', () => {
  const msg = buildWhatsAppMessage(receipt('ar', 'delivery'));
  assert.match(msg, /^رقم الطلب: طلب تجريبي$/m);
  assert.doesNotMatch(msg, /ملاحظات/);
});

test('he pickup message', () => {
  const msg = buildWhatsAppMessage({ ...receipt('he', 'pickup'), order_number: 7 });
  assert.match(msg, /^🔥 הזמנה חדשה מג'מרה$/m);
  assert.match(msg, /^מספר הזמנה: #7$/m);
  assert.match(msg, /^2× שווארמת עוף בלאפה \(חריף\) – ₪48$/m);
  assert.match(msg, /^🏃 איסוף עצמי$/m);
  assert.match(msg, /^⏱ מוכן תוך: כ-20 דקות$/m);
  assert.match(msg, /^💳 תשלום: ביט \(באיסוף\)$/m);
  assert.doesNotMatch(msg, /דמי משלוח/);
  assert.doesNotMatch(msg, /Main St/);
});

test('en delivery and pickup messages', () => {
  const d = buildWhatsAppMessage({ ...receipt('en', 'delivery'), order_number: 1001 });
  assert.match(d, /^🔥 New order — Jamra$/m);
  assert.match(d, /^Order #1001$/m);
  assert.match(d, /^📍 Delivering to: Nazareth – Main St 1 \(near the mosque\)$/m);
  assert.match(d, /^💳 Payment: Bit \(on delivery\)$/m);
  const p = buildWhatsAppMessage(receipt('en', 'pickup'));
  assert.match(p, /^Order: Demo order$/m);
  assert.match(p, /^🏃 Pickup$/m);
  assert.match(p, /^🧾 Total: ₪54$/m);
});

test('wa.me url encodes the text and strips non-digits from the number', () => {
  assert.equal(whatsappUrl('+972-50-123-4567', 'a b\n#1'), 'https://wa.me/972501234567?text=a%20b%0A%231');
  assert.equal(whatsappUrl(null, 'hi'), 'https://wa.me/?text=hi');
});
