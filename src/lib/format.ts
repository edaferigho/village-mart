/**
 * Money + delivery-fee helpers.
 *
 * All prices are stored as whole Naira integers in Supabase, so no floating
 * point maths is needed anywhere in the app.
 */
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from "./constants";

// Re-export so UI modules can import pricing rules from one place.
export { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD };

/** Format a Naira amount, e.g. 12500 -> "₦12,500". */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/**
 * Delivery fee for a given subtotal:
 * free at/above FREE_DELIVERY_THRESHOLD, flat DELIVERY_FEE otherwise.
 */
export function deliveryFeeFor(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

/** Amount still needed to unlock free delivery (0 when already unlocked). */
export function amountToFreeDelivery(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}
