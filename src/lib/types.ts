/**
 * Shared TypeScript types used across the Village Mart app.
 *
 * These mirror the tables created in `supabase/schema.sql`.
 */

/** A product category, e.g. "Rice & Grains". */
export interface Category {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  image_url: string | null;
  sort_order: number | null;
}

/** A foodstuff product (pricepally-style packaged goods, priced in Naira). */
export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  category_slug: string;
  unit_label: string | null; // e.g. "50kg bag", "400g × 6"
  price: number; // in whole Naira
  compare_at_price: number | null; // original price when on SALE
  image_url: string | null;
  badge: "NEW" | "BESTSELLER" | "SALE" | null;
  rating: number | null;
  sort_order: number | null;
}

/** A customer account created from a Google sign-in. */
export interface Customer {
  id: string;
  google_sub: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
}

/** A discount promo code managed from the admin dashboard. */
export interface Promo {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number; // percent (1–90) or fixed ₦ off
  scope: "all" | "category" | "product";
  scope_value: string | null; // category slug or product id when scoped
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  usage_count: number;
}

/** One line of an order (snapshot of the product at purchase time). */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

/** A checkout order persisted in Supabase. */
export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  state: string;
  note: string | null;
  payment_method: "pay_on_delivery" | "bank_transfer" | "paystack";
  payment_reference: string | null; // Paystack transaction reference
  payment_status: "unpaid" | "paid";
  paid_at: string | null;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  subtotal: number;
  discount_amount: number; // promo discount applied at purchase time
  promo_code: string | null;
  delivery_fee: number;
  total: number;
  confirmation_email_sent: boolean | null;
  created_at: string;
  order_items?: OrderItem[]; // embedded by PostgREST when requested
}

/** The lightweight identity stored inside the signed session cookie. */
export interface SessionUser {
  id: string; // customers.id in Supabase
  email: string;
  name: string;
  picture: string | null;
}

/** An item inside the client-side shopping cart (localStorage). */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  unitLabel: string;
  price: number;
  imageUrl: string;
  quantity: number;
}
