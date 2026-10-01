/**
 * Order confirmation page (/order/<id>).
 * Reads the order + items straight from Supabase so the page survives
 * refreshes and can be revisited later from "My Orders".
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { formatNaira } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: { id: string } }) {
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

  const typed = order as Order;
  const items = typed.order_items ?? [];

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
