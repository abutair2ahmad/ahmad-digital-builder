export type Locale = 'ar' | 'he' | 'en';
export type I18n = Record<Locale, string>;
export type OrderStatus = 'new' | 'confirmed' | 'delivered' | 'cancelled';
export type Fulfillment = 'delivery' | 'pickup';
export type PaymentMethod = 'cash' | 'card' | 'bit';
export type Weekday = '0' | '1' | '2' | '3' | '4' | '5' | '6'; // 0 = Sunday
export type OpeningHours = Partial<Record<Weekday, Array<[string, string]>>>;

export interface OptionChoice { id: string; label: I18n; price_delta: number }
export interface OptionGroup { id: string; label: I18n; type: 'single' | 'multi'; required: boolean; max?: number; choices: OptionChoice[] }
export interface Category { id: string; slug: string; name: I18n; sort_order: number; active: boolean }
export interface MenuItem { id: string; category_id: string; slug: string; name: I18n; description: I18n | null; price: number; image_path: string | null; options: OptionGroup[]; is_sold_out: boolean; active: boolean; sort_order: number }
export interface DeliveryZone { id: string; slug: string; name: I18n; fee: number; eta_minutes: number; min_order: number; active: boolean; sort_order: number }
export interface Settings { whatsapp_number: string; opening_hours: OpeningHours; accepting_orders: boolean; commission_rate: number; pickup_eta_minutes: number; currency: 'ILS' }

export interface OrderLineOption { group_id: string; group: I18n; choice_id: string; label: I18n; price_delta: number }
export interface OrderLine { item_id: string; name: I18n; qty: number; unit_price: number; options: OrderLineOption[]; note: string | null; line_total: number }

export type OptionSelection = Record<string, string | string[]>;
export interface OrderItemInput { item_id: string; qty: number; options?: OptionSelection; note?: string }

export interface PlaceOrderInput {
  idempotency_key: string;
  locale: Locale;
  fulfillment: Fulfillment;
  payment_method: PaymentMethod;
  /** Required for delivery; ignored for pickup. */
  zone_id: string | null;
  customer: { name: string; phone: string; address?: string; landmark?: string; notes?: string };
  items: OrderItemInput[];
}

/** What place_order returns; the WhatsApp message is built from this, not the cart. */
export interface Receipt {
  /** null in demo mode: nothing is saved, so there is no number. */
  order_number: number | null;
  status: OrderStatus;
  locale: Locale;
  fulfillment: Fulfillment;
  payment_method: PaymentMethod;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  landmark: string | null;
  notes: string | null;
  zone_name: I18n | null;
  eta_minutes: number;
  items: OrderLine[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  /** null when no usable number: the demo without NEXT_PUBLIC_DEMO_WHATSAPP, or the placeholder. */
  whatsapp_number: string | null;
}

export interface Order extends Omit<Receipt, 'whatsapp_number'> {
  id: string;
  order_number: number;
  zone_id: string | null;
}

export interface DashboardStats { month_start: string; orders_count: number; pending_count: number; cancelled_count: number; revenue: number; food_subtotal: number; commission_rate: number; wolt_savings_estimate: number; today_count: number; today_revenue: number }

/** Everything the public site reads; one cached object. */
export interface MenuData {
  categories: Category[];
  items: MenuItem[];
  zones: DeliveryZone[];
  settings: Settings;
}

export type OrderErrorCode =
  | 'INVALID_PAYLOAD'
  | 'INVALID_CUSTOMER'
  | 'INVALID_PHONE'
  | 'NOT_ACCEPTING'
  | 'CLOSED'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'ZONE_UNAVAILABLE'
  | 'TOO_MANY_ITEMS'
  | 'ITEM_UNAVAILABLE'
  | 'ITEM_SOLD_OUT'
  | 'INVALID_OPTIONS'
  | 'BELOW_MINIMUM'
  | 'UNKNOWN';

export const ORDER_ERROR_CODES: readonly OrderErrorCode[] = [
  'INVALID_PAYLOAD',
  'INVALID_CUSTOMER',
  'INVALID_PHONE',
  'NOT_ACCEPTING',
  'CLOSED',
  'RATE_LIMITED',
  'BUSY',
  'ZONE_UNAVAILABLE',
  'TOO_MANY_ITEMS',
  'ITEM_UNAVAILABLE',
  'ITEM_SOLD_OUT',
  'INVALID_OPTIONS',
  'BELOW_MINIMUM',
  'UNKNOWN',
];
