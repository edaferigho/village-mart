/**
 * Paystack server helpers (secret-key operations only — never expose the
 * secret key to the browser).
 *
 * Flow used by the storefront:
 *   1. Checkout places the order (paymentMethod = 'paystack', unpaid).
 *   2. POST /api/payments/initialize  → creates a Paystack transaction for
 *      the order total (in KOBO) and returns an access_code.
 *   3. The browser opens the Paystack POPUP (inline.js v2) with that code;
 *      the customer chooses Card or Bank Transfer inside it.
 *   4. On return, POST /api/payments/verify (also called automatically by
 *      the order page) confirms the payment with Paystack and marks the
 *      order paid + confirmed.
 */
import { createSupabaseClient } from "./supabase";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is missing — add it to the environment");
  }
  return key;
}

/** True when Paystack credentials are present in the environment. */
export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

/** Low-level POST/GET against the Paystack API. */
async function paystackRequest<T>(
  method: "POST" | "GET",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !json.status) {
    throw new Error(`Paystack ${path} failed: ${json.message ?? res.status}`);
  }
  return json.data;
}

/** Create a Paystack transaction; returns the access_code for the popup. */
export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ accessCode: string }> {
  const data = await paystackRequest<{ access_code: string }>("POST", "/transaction/initialize", {
    email: params.email,
    amount: params.amountKobo, // Paystack expects kobo (₦1 = 100 kobo)
    reference: params.reference,
    currency: "NGN",
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  });
  return { accessCode: data.access_code };
}

/** The verification result we care about. */
export interface PaystackVerification {
  status: "success" | "failed" | "abandoned" | "pending";
  amountKobo: number;
  paidAt: string | null;
  reference: string;
}

/** Verify a transaction server-side (the source of truth for marking paid). */
export async function verifyTransaction(reference: string): Promise<PaystackVerification> {
  const data = await paystackRequest<{
    status: string;
    amount: number;
    paid_at: string | null;
    reference: string;
  }>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);

  return {
    status:
      data.status === "success"
        ? "success"
        : data.status === "failed"
          ? "failed"
          : data.status === "abandoned"
            ? "abandoned"
            : "pending",
    amountKobo: data.amount,
    paidAt: data.paid_at,
    reference: data.reference,
  };
}

/**
 * Verify a specific order's payment and update it in Supabase.
 * Returns the order's payment state after verification.
 */
export async function verifyOrderPayment(order: {
  id: string;
  order_number: string;
  total: number;
  payment_reference: string | null;
  payment_status: string;
}): Promise<{ paid: boolean; message: string }> {
  if (!order.payment_reference) {
    return { paid: false, message: "No payment has been started for this order yet" };
  }

  const result = await verifyTransaction(order.payment_reference);

  if (result.status === "success") {
    // Guard against tampered/underpaid references: the paid amount must
    // cover the order total (amounts are kobo on both sides).
    if (result.amountKobo + 1 < order.total * 100) {
      return { paid: false, message: "Payment amount did not match the order total" };
    }
    const supabase = createSupabaseClient();
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        paid_at: result.paidAt ? new Date(result.paidAt).toISOString() : new Date().toISOString(),
      })
      .eq("id", order.id);
    return { paid: true, message: "Payment confirmed" };
  }

  if (result.status === "failed") {
    return { paid: false, message: "The payment attempt failed — please try again" };
  }
  return { paid: false, message: "Payment is still pending — complete it and refresh" };
}
