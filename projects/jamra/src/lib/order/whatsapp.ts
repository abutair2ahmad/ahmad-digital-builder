/**
 * The WhatsApp order message, built from the server receipt (never from the
 * cart) in the customer's language. Emoji are allowed here and only here.
 */
import { formatPlainPrice } from '@/lib/i18n/format';
import { formatLocalPhone } from '@/lib/order/phone';
import type { Locale, PaymentMethod, Receipt } from '@/lib/types';

interface Labels {
  title: string;
  orderNumber: string;
  demoOrder: string;
  order: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  deliverTo: string;
  pickup: string;
  etaDelivery: (eta: number) => string;
  etaPickup: (eta: number) => string;
  name: string;
  phone: string;
  payment: string;
  paymentWhen: { delivery: string; pickup: string };
  methods: Record<PaymentMethod, string>;
  notes: string;
  optionSep: string;
}

const LABELS: Record<Locale, Labels> = {
  ar: {
    title: '🔥 طلب جديد من جمرة',
    orderNumber: 'رقم الطلب',
    demoOrder: 'طلب تجريبي',
    order: '📋 الطلب',
    subtotal: '💰 المجموع الفرعي',
    deliveryFee: '🚚 رسوم التوصيل',
    total: '🧾 الإجمالي',
    deliverTo: '📍 التوصيل إلى',
    pickup: '🏃 استلام من المطعم',
    etaDelivery: (eta) => `⏱ بيوصل خلال: ~${eta} دقيقة`,
    etaPickup: (eta) => `⏱ جاهز خلال: ~${eta} دقيقة`,
    name: '👤 الاسم',
    phone: '📞 الهاتف',
    payment: '💳 الدفع',
    paymentWhen: { delivery: 'عند الاستلام', pickup: 'عند الاستلام' },
    methods: { cash: 'كاش', card: 'بطاقة', bit: 'Bit' },
    notes: '📝 ملاحظات',
    optionSep: '، ',
  },
  he: {
    title: '🔥 הזמנה חדשה מג\'מרה',
    orderNumber: 'מספר הזמנה',
    demoOrder: 'הזמנת דמו',
    order: '📋 ההזמנה',
    subtotal: '💰 סכום ביניים',
    deliveryFee: '🚚 דמי משלוח',
    total: '🧾 סה"כ לתשלום',
    deliverTo: '📍 משלוח אל',
    pickup: '🏃 איסוף עצמי',
    etaDelivery: (eta) => `⏱ זמן הגעה משוער: כ-${eta} דקות`,
    etaPickup: (eta) => `⏱ מוכן תוך: כ-${eta} דקות`,
    name: '👤 שם',
    phone: '📞 טלפון',
    payment: '💳 תשלום',
    paymentWhen: { delivery: 'במסירה', pickup: 'באיסוף' },
    methods: { cash: 'מזומן', card: 'כרטיס אשראי', bit: 'ביט' },
    notes: '📝 הערות',
    optionSep: ', ',
  },
  en: {
    title: '🔥 New order — Jamra',
    orderNumber: 'Order',
    demoOrder: 'Demo order',
    order: '📋 Order',
    subtotal: '💰 Subtotal',
    deliveryFee: '🚚 Delivery fee',
    total: '🧾 Total',
    deliverTo: '📍 Delivering to',
    pickup: '🏃 Pickup',
    etaDelivery: (eta) => `⏱ ETA: ~${eta} min`,
    etaPickup: (eta) => `⏱ Ready in: ~${eta} min`,
    name: '👤 Name',
    phone: '📞 Phone',
    payment: '💳 Payment',
    paymentWhen: { delivery: 'on delivery', pickup: 'at pickup' },
    methods: { cash: 'Cash', card: 'Card', bit: 'Bit' },
    notes: '📝 Notes',
    optionSep: ', ',
  },
};

export function buildWhatsAppMessage(receipt: Receipt): string {
  const locale = receipt.locale;
  const L = LABELS[locale];
  const demo = receipt.order_number === null;
  const orderLine = locale === 'en'
    ? (demo ? `Order: ${L.demoOrder}` : `Order #${receipt.order_number}`)
    : `${L.orderNumber}: ${demo ? L.demoOrder : `#${receipt.order_number}`}`;

  const lines = receipt.items.map((line) => {
    const opts = line.options.map((o) => o.label[locale]).join(L.optionSep);
    return `${line.qty}× ${line.name[locale]}${opts ? ` (${opts})` : ''} – ${formatPlainPrice(line.line_total)}`;
  });

  const delivery = receipt.fulfillment === 'delivery';
  const where = delivery
    ? `${L.deliverTo}: ${receipt.zone_name?.[locale] ?? ''} – ${receipt.address ?? ''}${receipt.landmark ? ` (${receipt.landmark})` : ''}`
    : L.pickup;

  const out = [
    L.title,
    orderLine,
    '',
    `${L.order}:`,
    ...lines,
    '',
    `${L.subtotal}: ${formatPlainPrice(receipt.subtotal)}`,
    ...(delivery ? [`${L.deliveryFee}: ${formatPlainPrice(receipt.delivery_fee)}`] : []),
    `${L.total}: ${formatPlainPrice(receipt.total)}`,
    '',
    where,
    delivery ? L.etaDelivery(receipt.eta_minutes) : L.etaPickup(receipt.eta_minutes),
    `${L.name}: ${receipt.customer_name}`,
    `${L.phone}: ${formatLocalPhone(receipt.customer_phone)}`,
    `${L.payment}: ${L.methods[receipt.payment_method]} (${L.paymentWhen[receipt.fulfillment]})`,
  ];
  if (receipt.notes) out.push(`${L.notes}: ${receipt.notes}`);
  return out.join('\n');
}

/**
 * wa.me link with the message prefilled. With a number it opens that chat;
 * without one (null) WhatsApp asks the visitor which chat to send it to, so
 * nothing goes to a number we don't control.
 */
export function whatsappUrl(number: string | null, text: string): string {
  const digits = number?.replace(/\D/g, '') ?? '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
