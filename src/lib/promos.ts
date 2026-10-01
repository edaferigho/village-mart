/**
 * Promo code evaluation, shared by:
 *   • POST /api/promos/validate  (checkout "Apply" button — public)
 *   • POST /api/orders           (final validation + discount at order time)
 *
 * Discount rules:
 *   • promo must be active and within its optional start/end window;
 *   • scope 'all'     -> discount applies to the whole subtotal;
 *   • scope 'category'-> only to lines whose product is in that category;
 *   • scope 'product' -> only to the matching product's lines;
 *   • 'percent' value = percentage off the eligible subtotal;
 *   • 'fixed'   value = flat ₦ off, capped at the eligible subtotal;
 *   • the discount never exceeds the eligible subtotal (delivery unaffected).
 */
import { createSupabaseClient } from "./supabase";
import type { Promo } from "./types";

/** Minimal line shape needed to evaluate scoping. */
export interface PromoLine {
  product_id: string;
  category_slug: string;
  line_total: number;
}

export type PromoResult =
  | { ok: true; promo: Promo; discount: number; message: string }
  | { ok: false; error: string };

/** Sum the lines a promo's scope covers. */
function eligibleSubtotal(promo: Promo, lines: PromoLine[]): number {
  switch (promo.scope) {
    case "category":
      return lines
        .filter((l) => l.category_slug === promo.scope_value)
        .reduce((sum, l) => sum + l.line_total, 0);
    case "product":
      return lines
        .filter((l) => l.product_id === promo.scope_value)
        .reduce((sum, l) => sum + l.line_total, 0);
    default: // 'all'
      return lines.reduce((sum, l) => sum + l.line_total, 0);
  }
}

/** Compute the discount for a known-good promo against the given lines. */
export function computePromoDiscount(promo: Promo, lines: PromoLine[]): number {
  const eligible = eligibleSubtotal(promo, lines);
  if (eligible <= 0) return 0;
  const discount =
    promo.type === "percent"
      ? Math.floor((eligible * promo.value) / 100)
      : Math.min(promo.value, eligible);
  return Math.min(discount, eligible);
}

/** Validate a promo code string against the DB + time window, then price it. */
export async function validatePromoCode(
  rawCode: string,
  lines: PromoLine[]
): Promise<PromoResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a promo code" };

  const supabase = createSupabaseClient();
  const { data: promo, error } = await supabase
    .from("promos")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "PGRST205") {
      return { ok: false, error: "Promos table not set up — run supabase/migration-admin.sql" };
    }
    console.error("promo lookup failed:", error.message);
    return { ok: false, error: "Could not check that code — try again" };
  }
  if (!promo) return { ok: false, error: `"${code}" is not a valid promo code` };

  const typed = promo as Promo;
  if (!typed.is_active) return { ok: false, error: `"${code}" is no longer active` };

  const now = Date.now();
  if (typed.starts_at && now < new Date(typed.starts_at).getTime()) {
    return { ok: false, error: `"${code}" is not active yet` };
  }
  if (typed.ends_at && now > new Date(typed.ends_at).getTime()) {
    return { ok: false, error: `"${code}" has expired` };
  }

  const eligible = eligibleSubtotal(typed, lines);
  if (eligible <= 0) {
    return {
      ok: false,
      error:
        typed.scope === "category"
          ? `"${code}" only applies to ${typed.scope_value?.replace(/-/g, " ")} items`
          : `"${code}" doesn't apply to the items in your cart`,
    };
  }

  const discount = computePromoDiscount(typed, lines);
  const message =
    typed.type === "percent"
      ? `${typed.value}% off applied`
      : `₦${typed.value.toLocaleString("en-NG")} off applied`;

  return { ok: true, promo: typed, discount, message };
}
