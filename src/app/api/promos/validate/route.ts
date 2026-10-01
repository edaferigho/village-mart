/**
 * POST /api/promos/validate — public endpoint used by the checkout page's
 * "Apply" button. Checks the code and returns the discount for the current
 * cart. The final, authoritative check happens again inside POST /api/orders
 * when the order is actually placed.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase";
import { validatePromoCode } from "@/lib/promos";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Cart is empty"),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Enter a promo code" }, { status: 400 });
  }

  // Fetch the cart's products so the promo scope can be evaluated.
  const supabase = createSupabaseClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, price, category_slug")
    .in("id", body.items.map((i) => i.productId));

  if (error || !products) {
    return NextResponse.json({ ok: false, error: "Could not check that code — try again" }, { status: 500 });
  }
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = body.items.map((item) => {
    const product = byId.get(item.productId);
    return {
      product_id: item.productId,
      category_slug: product?.category_slug ?? "",
      line_total: (product?.price ?? 0) * item.quantity,
    };
  });

  const result = await validatePromoCode(body.code, lines);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  return NextResponse.json({
    ok: true,
    code: result.promo.code,
    discount: result.discount,
    message: result.message,
  });
}
