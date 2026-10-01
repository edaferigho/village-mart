/**
 * POST /api/payments/verify — confirm a Paystack payment server-side.
 *
 * Body: { orderId }
 * Looks up the order's stored transaction reference, asks Paystack whether
 * it succeeded, and (on success) marks the order paid + confirmed.
 * The order page calls this automatically for unpaid Paystack orders, so a
 * customer who closes the popup gets confirmed on their next visit too.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { isPaystackConfigured, verifyOrderPayment } from "@/lib/paystack";

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
    .select("id, order_number, total, payment_reference, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return NextResponse.json({ error: "Database not set up yet" }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not find that order" }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.payment_status === "paid") {
    return NextResponse.json({ paid: true, message: "Payment already confirmed" });
  }

  try {
    const result = await verifyOrderPayment(order as never);
    return NextResponse.json(result);
  } catch (err) {
    console.error("paystack verify failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 502 }
    );
  }
}
