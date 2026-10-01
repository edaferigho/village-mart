/**
 * Order confirmation page (/order/<id>).
 * Reads the order + items straight from Supabase so the page survives
 * refreshes and can be revisited later from "My Orders".
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { verifyOrderPayment } from "@/lib/paystack";
import { formatNaira } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import CompletePaymentButton from "@/components/CompletePaymentButton";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: {
  params: { id: string };
  searchParams?: { ref?: string };
}) {
  const supabase = createSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)") // PostgREST embed: items alongside the order
    .eq("id", params.id)
    .maybeSingle();

  if (error && !isMissingSchemaError(error)) {
    console.error("order page query failed:", error.message);
  }
  if (!order) notFound();

  let typed = order as Order;

  // Paystack orders that are still unpaid get re-checked with Paystack on
  // every visit — so a customer returning from the popup (or refreshing
  // later) is confirmed without needing a webhook.
  if (typed.payment_method === "paystack" && typed.payment_status === "unpaid") {
    try {
      await verifyOrderPayment(typed);
      const { data: fresh } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", params.id)
        .maybeSingle();
      if (fresh) typed = fresh as Order;
    } catch (err) {
      // Verification is best-effort — the page still renders unpaid state.
      console.error("payment verification failed:", err);
    }
  }

  const items = typed.order_items ?? [];
  const justPaid = typed.payment_status === "paid" && typed.paid_at != null;

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-2xl">
        {/* Success header */}
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-8 w-8">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="mt-5 text-3xl font-extrabold text-navy">Order placed successfully!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Thank you, {typed.customer_name.split(" ")[0]} — our team is preparing your foodstuff.
          </p>
          <p className="mt-4 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-bold text-brand-700">
            Order #{typed.order_number}
          </p>
        </div>

        {/* Payment status */}
        {typed.payment_method === "paystack" && (
          justPaid ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              💳 Payment received — {formatNaira(typed.total)} paid via Paystack
              {typed.paid_at
                ? ` on ${new Date(typed.paid_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : ""}
              {typed.payment_reference ? ` · Ref: ${typed.payment_reference}` : ""}. Your order is confirmed.
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-medium text-amber-800">
                ⏳ Payment pending — complete it securely below. The popup lets you pay with{" "}
                <span className="font-semibold">Card</span> or <span className="font-semibold">Bank Transfer</span>.
              </p>
              <CompletePaymentButton orderId={typed.id} />
            </div>
          )
        )}

        {/* Email delivery note */}
        <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
          typed.confirmation_email_sent
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {typed.confirmation_email_sent
            ? `📬 A confirmation email is on its way to ${typed.customer_email}.`
            : `⚠️ We saved your order but couldn't email ${typed.customer_email}. Mailgun sandbox domains only deliver to Authorized Recipients — add that address in your Mailgun dashboard to receive confirmations.`}
        </div>

        {/* Order summary card */}
        <div className="card mt-6 p-6">
          <h2 className="text-lg font-extrabold text-navy">Order Summary</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                  {item.quantity}×
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">{item.product_name}</p>
                  {item.unit_label && <p className="text-xs text-slate-500">{item.unit_label}</p>}
                </div>
                <p className="text-sm font-bold text-navy">{formatNaira(item.line_total)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-2.5 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold text-navy">{formatNaira(typed.subtotal)}</dd>
            </div>
            {(typed.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between">
                <dt className="text-emerald-700">
                  Promo discount{typed.promo_code ? ` (${typed.promo_code})` : ""}
                </dt>
                <dd className="font-semibold text-emerald-700">−{formatNaira(typed.discount_amount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery fee</dt>
              <dd className="font-semibold text-navy">
                {typed.delivery_fee === 0 ? <span className="text-emerald-600">FREE</span> : formatNaira(typed.delivery_fee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-bold text-navy">Total</dt>
              <dd className="font-extrabold text-brand-600">{formatNaira(typed.total)}</dd>
            </div>
          </dl>

          {/* Delivery details */}
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-bold text-navy">Delivering to</p>
            <p>{typed.delivery_address}, {typed.city}, {typed.state}</p>
            <p>Phone: {typed.customer_phone}</p>
            <p>Payment: {PAYMENT_METHOD_LABELS[typed.payment_method] ?? typed.payment_method}</p>
            {typed.note && <p className="mt-1 italic text-slate-500">“{typed.note}”</p>}
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="btn-primary">Continue Shopping</Link>
          <Link href="/account" className="btn-outline">View My Orders</Link>
        </div>
      </div>
    </div>
  );
}
