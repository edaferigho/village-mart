/**
 * Cart ownership.
 *
 * Every cart line belongs to an `owner_key`:
 *   • `user:<customer id>` — signed-in customers (same on web & mobile), or
 *   • `device:<uuid>`      — guests (browser cookie / app storage).
 *
 * When a guest signs in, their device cart is merged into the user cart by
 * `mergeDeviceCartIntoUserCart` (called from the Google callback on web and
 * the pairing endpoint on mobile).
 */
import { createSupabaseClient } from "./supabase";
import { resolveRequestUser } from "./auth-request";
import { cookies } from "next/headers";

/** Cookie that keeps a stable guest identity in the browser. */
export const DEVICE_COOKIE = "vm_device";

export interface CartOwner {
  ownerKey: string;
  customerId: string | null;
  deviceId: string | null;
}

/** Resolve the cart owner for an API request (session first, then device). */
export async function resolveCartOwner(): Promise<CartOwner | null> {
  const user = await resolveRequestUser();
  if (user) return { ownerKey: `user:${user.id}`, customerId: user.id, deviceId: null };

  const deviceId = cookies().get(DEVICE_COOKIE)?.value;
  if (deviceId && /^[\w-]{8,64}$/.test(deviceId)) {
    return { ownerKey: `device:${deviceId}`, customerId: null, deviceId };
  }
  return null;
}

/**
 * Merge a device cart into a user cart after sign-in (web Google callback or
 * mobile pairing). Line quantities are combined (capped at 99); the device
 * rows are removed afterwards. Best-effort: sign-in never fails because of
 * cart merging.
 */
export async function mergeDeviceCartIntoUserCart(
  deviceId: string,
  customerId: string
): Promise<void> {
  const supabase = createSupabaseClient();
  const deviceKey = `device:${deviceId}`;
  const userKey = `user:${customerId}`;

  const { data: deviceRows } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("owner_key", deviceKey);
  if (!deviceRows || deviceRows.length === 0) return;

  const { data: userRows } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("owner_key", userKey);
  const existing = new Map((userRows ?? []).map((r) => [r.product_id, r.quantity]));

  // Upsert combined quantities into the user cart.
  const upserts = deviceRows.map((row) => ({
    owner_key: userKey,
    product_id: row.product_id,
    quantity: Math.min(99, Math.max(row.quantity, existing.get(row.product_id) ?? 0) + row.quantity),
  }));
  if (upserts.length > 0) {
    await supabase
      .from("cart_items")
      .upsert(upserts, { onConflict: "owner_key,product_id" });
  }
  // Clear the device cart.
  await supabase.from("cart_items").delete().eq("owner_key", deviceKey);
}
