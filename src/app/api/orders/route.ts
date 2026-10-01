/**
 * POST /api/orders — place an order (checkout submission).
 *
 * Security model:
 *  • The client only sends product IDs and quantities — NEVER prices.
 *    Every line is re-priced here against the Supabase `products` table.
 *  • Input is validated with zod before anything touches the database.
 *  • Totals (subtotal, delivery fee, grand total) are computed server-side.
 *
 * Flow: validate → re-price → insert order → insert items →
 *       send Mailgun confirmation email → return the order id.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { sendEmail, buildOrderConfirmationEmail, isMailgunConfigured } from "@/lib/mailgun";
import { deliveryFeeFor } from "@/lib/format";
import { validatePromoCode } from "@/lib/promos";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

/** Payload shape sent by the checkout page. */
const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Full name is required").max(120),
    email: z.string().trim().email("A valid email is required").max(200),
    phone: z.string().trim().min(7, "Phone number is required").max(30),
  }),
  delivery: z.object({
    address: z.string().trim().min(5, "Street address is required").max(300),
    city: z.string().trim().min(2, "City is required").max(100),
    state: z.string().trim().min(2, "State is required").max(100),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  paymentMethod: z.enum(["pay_on_delivery", "bank_transfer", "paystack"]),
  promoCode: z.string().trim().max(40).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Cart is empty")
    .max(50),
});

/** Generate a readable, unique-enough order number, e.g. VM-8F3KQ2. */
function generateOrderNumber(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no lookalike chars
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[crypto.randomUUID()[i * 3].charCodeAt(0) % alphabet.length];
  }
  return `VM-${suffix}`;
}

export async function POST(request: NextRequest) {
  // ---- 1. Parse + validate the payload ----------------------------------
  let payload: z.infer<typeof orderSchema>;
  try {
    const json = await request.json();
    payload = orderSchema.parse(json);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.errors[0]?.message ?? "Invalid order details"
        : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createSupabaseClient();

  // ---- 2. Re-price every line against the database -----------------------
  const productIds = payload.items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, unit_label, price, category_slug")
    .in("id", productIds);

  if (productsError) {
    if (isMissingSchemaError(productsError)) {
      return NextResponse.json(
        {
          error:
            "The database isn't set up yet. Run supabase/schema.sql and supabase/seed.sql in the Supabase SQL editor, then try again.",
        },
        { status: 503 }
      );
    }
    console.error("products lookup failed:", productsError.message);
    return NextResponse.json({ error: "Could not verify your cart. Please try again." }, { status: 500 });
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  // Unknown/deleted product in the cart → reject rather than guess prices.
  const lines: {
    product_id: string;
    product_name: string;
    unit_label: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
    category_slug: string;
  }[] = [];
  for (const item of payload.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: "One of the items in your cart is no longer available. Please refresh your cart." },
        { status: 409 }
      );
    }
    lines.push({
      product_id: product.id,
      product_name: product.name,
      unit_label: product.unit_label,
      unit_price: product.price,
      quantity: item.quantity,
      line_total: product.price * item.quantity,
      category_slug: product.category_slug,
    });
  }

  // ---- 3. Compute totals (server-side source of truth) -------------------
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);

  // Optional promo code — validated against the DB again right here, so a
  // stale/expired code from the client can never apply a phantom discount.
  let discountAmount = 0;
  let appliedPromoCode: string | null = null;
  if (payload.promoCode) {
    const promoResult = await validatePromoCode(
      payload.promoCode,
      lines.map((l) => ({ product_id: l.product_id, category_slug: l.category_slug, line_total: l.line_total }))
    );
    if (!promoResult.ok) {
      return NextResponse.json({ error: `Promo code: ${promoResult.error}` }, { status: 409 });
    }
    discountAmount = promoResult.discount;
    appliedPromoCode = promoResult.promo.code;
  }

  const deliveryFee = deliveryFeeFor(subtotal);
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;

  // Attach the signed-in Google customer, if any.
  const sessionUser = await getSessionUser();

  // ---- 4. Persist the order ----------------------------------------------
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: generateOrderNumber(),
      customer_id: sessionUser?.id ?? null,
      customer_name: payload.customer.name,
      customer_email: payload.customer.email,
      customer_phone: payload.customer.phone,
      delivery_address: payload.delivery.address,
      city: payload.delivery.city,
      state: payload.delivery.state,
      note: payload.delivery.note || null,
      payment_method: payload.paymentMethod,
      status: "pending",
      subtotal,
      discount_amount: discountAmount,
      promo_code: appliedPromoCode,
      delivery_fee: deliveryFee,
      total,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    if (isMissingSchemaError(orderError)) {
      return NextResponse.json(
        {
          error:
            "The database isn't set up yet. Run supabase/schema.sql and supabase/seed.sql in the Supabase SQL editor, then try again.",
        },
        { status: 503 }
      );
    }
    console.error("order insert failed:", orderError?.message);
    return NextResponse.json({ error: "Could not save your order. Please try again." }, { status: 500 });
  }

  // ---- 5. Persist the line items (snapshot of prices at purchase time) ---
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      lines.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        product_name: line.product_name,
        unit_label: line.unit_label,
        unit_price: line.unit_price,
        quantity: line.quantity,
        line_total: line.line_total,
      }))
    );

  if (itemsError) {
    // The order exists at this point; log loudly but don't fail the customer.
    console.error(`order_items insert failed for ${order.order_number}:`, itemsError.message);
  }

  // ---- 5b. Count promo usage (best-effort; never blocks the order) -------
  if (appliedPromoCode) {
    const { data: promoRow } = await supabase
      .from("promos")
      .select("id, usage_count")
      .eq("code", appliedPromoCode)
      .maybeSingle();
    if (promoRow) {
      await supabase
        .from("promos")
        .update({ usage_count: (promoRow.usage_count ?? 0) + 1 })
        .eq("id", promoRow.id);
    }
  }

  // ---- 6. Send the Mailgun confirmation email ----------------------------
  let emailSent = false;
  if (isMailgunConfigured()) {
    const paymentLabel = PAYMENT_METHOD_LABELS[payload.paymentMethod] ?? payload.paymentMethod;
    const { html, text } = buildOrderConfirmationEmail({
      orderNumber: order.order_number,
      customerName: payload.customer.name,
      items: lines.map((line) => ({
        name: line.product_name,
        unitLabel: line.unit_label,
        unitPrice: line.unit_price,
        quantity: line.quantity,
        lineTotal: line.line_total,
      })),
      subtotal,
      discountAmount,
      promoCode: appliedPromoCode,
      deliveryFee,
      total,
      delivery: {
        address: payload.delivery.address,
        city: payload.delivery.city,
        state: payload.delivery.state,
        phone: payload.customer.phone,
      },
      paymentMethod: paymentLabel,
    });

    const result = await sendEmail({
      to: payload.customer.email,
      subject: `Village Mart order ${order.order_number} confirmed`,
      html,
      text,
    });

    if (result.ok) {
      emailSent = true;
    } else {
      // Never block checkout on email problems — just record the failure.
      console.error(`Mailgun send failed for ${order.order_number}:`, result.error);
    }
  } else {
    console.warn("Mailgun not configured — skipping confirmation email.");
  }

  if (emailSent) {
    await supabase.from("orders").update({ confirmation_email_sent: true }).eq("id", order.id);
  }

  // ---- 7. Hand the order back to the checkout page -----------------------
  return NextResponse.json(
    {
      id: order.id,
      orderNumber: order.order_number,
      total,
      emailSent,
    },
    { status: 201 }
  );
}
