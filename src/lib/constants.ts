/**
 * Store-wide constants: pricing rules, navigation and data used by forms.
 */

/** Free delivery kicks in from this order subtotal (in Naira). */
export const FREE_DELIVERY_THRESHOLD = 50_000;

/** Flat delivery fee charged below the free-delivery threshold. */
export const DELIVERY_FEE = 2_500;

/** Header navigation — mirrors the moodboard's top nav. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?badge=NEW", label: "New Arrivals" },
  { href: "/shop?badge=BESTSELLER", label: "Best Sellers" },
  { href: "/account", label: "My Orders" },
] as const;

/** Nigerian states for the checkout delivery form. */
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

/** Friendly labels for order payment methods. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pay_on_delivery: "Pay on Delivery",
  bank_transfer: "Bank Transfer",
  paystack: "Online Payment (Card / Transfer)",
};

/** Friendly labels + colors for order status chips. */
export const ORDER_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-700" },
  delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700" },
};
