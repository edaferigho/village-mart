/**
 * POST /api/payments/initialize — start a Paystack payment for an order.
 *
 * Body: { orderId }
 * Returns: { accessCode, amount, email, publicKey } — the browser uses the
 * accessCode with Paystack's inline.js v2 to open the payment popup, where
 * the customer picks Card or Bank Transfer.
 *
 * Amounts are re-read from the saved order (never from the client), and an
 * order can only be initialized while it is unpaid.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";

const bodySchema = z.object({ orderId: z.string().uuid() });

export async function POST(request: NextRequest) {
  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: "Paystack isn't configured on this store yet" }, { status: 503 });
  }

  let orderId: string;
  try {
    orderId = bodySchema.parse(await request.json()).orderId;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, total, customer_email, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return NextResponse.json({ error: "Database not set up yet" }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not find that order" }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.payment_method !== "paystack") {
    return NextResponse.json({ error: "This order isn't a Paystack order" }, { status: 400 });
  }
  if (order.payment_status === "paid") {
    return NextResponse.json({ error: "This order is already paid" }, { status: 409 });
  }

  // Unique reference per attempt; stored on the order for later verification.
  const reference = `PSK-${order.order_number}-${Date.now().toString(36).toUpperCase()}`;

  try {
    const { accessCode } = await initializeTransaction({
      email: order.customer_email,
      amountKobo: order.total * 100,
      reference,
      callbackUrl: `${request.nextUrl.origin}/order/${order.id}`,
      metadata: { order_number: order.order_number },
    });

    await supabase.from("orders").update({ payment_reference: reference }).eq("id", order.id);

    return NextResponse.json({
      accessCode,
      amount: order.total,
      email: order.customer_email,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? null,
    });
  } catch (err) {
    console.error("paystack initialize failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start the payment" },
      { status: 502 }
    );
  }
}
