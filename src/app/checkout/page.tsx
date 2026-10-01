"use client";

/**
 * Checkout page — the final step of the purchase flow.
 *
 * Left column : contact details, delivery address, payment method.
 * Right column: live order summary with totals.
 *
 * On submit the cart is POSTed to /api/orders, which:
 *   1. validates the payload,
 *   2. re-computes every price against the Supabase `products` table,
 *   3. persists the order + order items in Supabase,
 *   4. sends the confirmation email through Mailgun,
 *   5. returns the order id — we then clear the cart and redirect to the
 *      confirmation page (/order/<id>).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { deliveryFeeFor, formatNaira, amountToFreeDelivery, FREE_DELIVERY_THRESHOLD } from "@/lib/format";
import { NIGERIAN_STATES, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import EmptyState from "@/components/EmptyState";
import { payWithPaystack } from "@/lib/paystack-client";

type PaymentMethod = "pay_on_delivery" | "bank_transfer" | "paystack";

/**
 * Best-effort: ask the server to verify the Paystack payment right away.
 * Never throws — the order page verifies again on load, and its background
 * poller corrects any miss within a few seconds.
 */
async function confirmPayment(orderId: string): Promise<void> {
  try {
    await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
  } catch {
    // ignore — verification also happens on the order page itself
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, isReady, clearCart } = useCart();

  // ----- form state -------------------------------------------------------
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "Lagos",
    note: "",
    paymentMethod: "pay_on_delivery" as PaymentMethod,
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Set when a Paystack order was saved but the popup was closed without paying.
  const [paystackNotice, setPaystackNotice] = useState<{ orderId: string } | null>(null);

  // ----- promo code state -------------------------------------------------
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [promoStatus, setPromoStatus] = useState<"idle" | "checking" | "error">("idle");
  const [promoError, setPromoError] = useState<string | null>(null);

  const deliveryFee = deliveryFeeFor(subtotal);
  const discount = appliedPromo?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  /** Ask the server to price the promo code against the current cart. */
  const applyPromo = async () => {
    if (!promoInput.trim() || promoStatus === "checking") return;
    setPromoStatus("checking");
    setPromoError(null);
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoInput,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "That code didn't work");
      }
      setAppliedPromo({ code: body.code, discount: body.discount, message: body.message });
      setPromoInput("");
      setPromoStatus("idle");
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "That code didn't work");
      setPromoStatus("error");
    }
  };

  /** Prefill contact details for signed-in shoppers. */
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setForm((f) => ({
            ...f,
            name: f.name || data.user.name || "",
            email: f.email || data.user.email || "",
          }));
        }
      })
      .catch(() => {}); // guest checkout is fine
  }, []);

  /** Keep a controlled-input helper. */
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  /** Simple client-side guard; the server validates again. */
  const formValid =
    form.name.trim().length >= 2 &&
    /.+@.+\..+/.test(form.email) &&
    form.phone.trim().length >= 7 &&
    form.address.trim().length >= 5 &&
    form.city.trim().length >= 2 &&
    items.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValid || submitting) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: form.name, email: form.email, phone: form.phone },
          delivery: { address: form.address, city: form.city, state: form.state, note: form.note },
          paymentMethod: form.paymentMethod,
          promoCode: appliedPromo?.code,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "We couldn't place your order. Please try again.");
      }

      const orderId: string = body.id;

      // Paystack orders: open the payment POPUP right after the order is
      // saved. On success go to the confirmation (which re-verifies with
      // Paystack); if the customer cancels, the order still exists and the
      // order page offers a "Complete Payment" button.
      if (form.paymentMethod === "paystack") {
        try {
          const reference = await payWithPaystack(orderId);
          // Confirm the payment server-side BEFORE navigating, so the order
          // page renders "Payment received" instead of a brief "Payment
          // pending" flash while Paystack's API catches up.
          await confirmPayment(orderId);
          clearCart();
          router.push(`/order/${orderId}?ref=${encodeURIComponent(reference)}`);
          return;
        } catch {
          clearCart();
          setPaystackNotice({ orderId });
          setSubmitting(false);
          return;
        }
      }

      // Non-Paystack flows: straight to the confirmation page.
      clearCart();
      router.push(`/order/${orderId}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  // Cart still hydrating — avoid flashing the empty state.
  if (!isReady) {
    return <div className="container-page py-16" aria-busy="true" />;
  }

  // Nothing to check out — unless a Paystack order was just saved with an
  // incomplete payment, in which case we show the "finish payment" panel.
  if (items.length === 0 && !paystackNotice) {
    return (
      <div className="container-page py-16">
        <h1 className="mb-8 text-3xl font-extrabold text-navy">Checkout</h1>
        <EmptyState
          variant="empty-cart"
          title="Nothing to check out"
          message="Your cart is empty — add some foodstuff first."
        />
      </div>
    );
  }

  // Order saved, popup closed without paying.
  if (paystackNotice) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
            ⏳
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy">Order saved — payment pending</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your order is safe, but the payment window closed before it was completed. Open your order
            below and press <span className="font-semibold text-navy">Complete Payment</span> whenever
            you&apos;re ready.
          </p>
          <Link href={`/order/${paystackNotice.orderId}`} className="btn-primary mt-6 w-full">
            Go to my order &amp; pay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold text-navy">Checkout</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fill in your delivery details — it takes less than a minute.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* ------------------------- left: form ------------------------- */}
        <div className="min-w-0 space-y-6">
          {/* Section 1 — contact */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
              Contact Information
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="label">Full name</label>
                <input id="name" required className="input" placeholder="Adaeze Okafor" value={form.name} onChange={set("name")} />
              </div>
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input id="email" type="email" required className="input" placeholder="you@example.com" value={form.email} onChange={set("email")} />
                <p className="mt-1 text-xs text-slate-400">Your order confirmation will be emailed here.</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="phone" className="label">Phone number</label>
                <input id="phone" required className="input" placeholder="0803 000 0000" value={form.phone} onChange={set("phone")} />
              </div>
            </div>
          </section>

          {/* Section 2 — delivery */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
              Delivery Address
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address" className="label">Street address</label>
                <input id="address" required className="input" placeholder="12 Adeola Odeku Street" value={form.address} onChange={set("address")} />
              </div>
              <div>
                <label htmlFor="city" className="label">City / Town</label>
                <input id="city" required className="input" placeholder="Ikeja" value={form.city} onChange={set("city")} />
              </div>
              <div>
                <label htmlFor="state" className="label">State</label>
                <select id="state" className="input" value={form.state} onChange={set("state")}>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="note" className="label">Delivery note <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea id="note" rows={2} className="input" placeholder="Landmark, gate code, best time to deliver…" value={form.note} onChange={set("note")} />
              </div>
            </div>
          </section>

          {/* Section 3 — payment */}
          <section className="card p-6">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-navy">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>
              Payment Method
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {/* Pay online with Paystack */}
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition sm:col-span-2 ${
                form.paymentMethod === "paystack"
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-slate-200 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paystack"
                  checked={form.paymentMethod === "paystack"}
                  onChange={set("paymentMethod")}
                  className="mt-1 accent-[#2563eb]"
                />
                <span>
                  <span className="block text-sm font-bold text-navy">
                    Pay Online — Card or Bank Transfer
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Secure Paystack popup: choose Card, Bank Transfer, USSD and more.
                  </span>
                </span>
                {/* Paystack wordmark */}
                <span className="ml-auto self-center rounded-md bg-[#0aa5c2] px-2 py-1 text-[10px] font-extrabold tracking-wide text-white">
                  paystack
                </span>
              </label>

              {/* Pay on delivery */}
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                form.paymentMethod === "pay_on_delivery"
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-slate-200 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pay_on_delivery"
                  checked={form.paymentMethod === "pay_on_delivery"}
                  onChange={set("paymentMethod")}
                  className="mt-1 accent-[#2563eb]"
                />
                <span>
                  <span className="block text-sm font-bold text-navy">Pay on Delivery</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Cash or POS when your order arrives.</span>
                </span>
              </label>

              {/* Manual bank transfer */}
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                form.paymentMethod === "bank_transfer"
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-slate-200 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={form.paymentMethod === "bank_transfer"}
                  onChange={set("paymentMethod")}
                  className="mt-1 accent-[#2563eb]"
                />
                <span>
                  <span className="block text-sm font-bold text-navy">Bank Transfer</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Account details sent with your confirmation email.</span>
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* ----------------------- right: summary ----------------------- */}
        <aside className="card h-fit min-w-0 p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold text-navy">Your Order</h2>

          <ul className="mt-4 divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl || "/images/placeholder.svg"}
                  alt={item.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{item.name}</p>
                  <p className="text-xs text-slate-500">Qty {item.quantity} × {formatNaira(item.price)}</p>
                </div>
                <p className="text-sm font-bold text-navy">{formatNaira(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-2.5 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold text-navy">{formatNaira(subtotal)}</dd>
            </div>
            {appliedPromo && (
              <div className="flex justify-between">
                <dt className="flex items-center gap-2 text-emerald-700">
                  Promo {appliedPromo.code}
                  {/* Remove the applied code */}
                  <button
                    type="button"
                    onClick={() => setAppliedPromo(null)}
                    className="rounded-full px-1.5 text-xs text-slate-400 hover:text-rose-600"
                    aria-label={`Remove promo code ${appliedPromo.code}`}
                    title="Remove promo code"
                  >
                    ×
                  </button>
                </dt>
                <dd className="font-semibold text-emerald-700">−{formatNaira(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery fee</dt>
              <dd className="font-semibold text-navy">
                {deliveryFee === 0 ? <span className="text-emerald-600">FREE</span> : formatNaira(deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-bold text-navy">Total</dt>
              <dd className="font-extrabold text-brand-600">{formatNaira(total)}</dd>
            </div>
          </dl>

          {/* Promo code entry */}
          {appliedPromo ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
              🎉 {appliedPromo.message} — you&apos;re saving {formatNaira(discount)} on this order.
            </p>
          ) : (
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promo code (e.g. JOLLOF10)"
                  className="input min-w-0 flex-1 font-mono uppercase"
                  aria-label="Promo code"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={promoStatus === "checking" || !promoInput.trim()}
                  className="btn-outline shrink-0 px-4 py-2.5 text-xs"
                >
                  {promoStatus === "checking" ? "…" : "Apply"}
                </button>
              </div>
              {promoError && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{promoError}</p>
              )}
            </div>
          )}

          {amountToFreeDelivery(subtotal) > 0 && (
            <p className="mt-4 rounded-lg bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700">
              Add {formatNaira(amountToFreeDelivery(subtotal))} more for free delivery (above {formatNaira(FREE_DELIVERY_THRESHOLD)}).
            </p>
          )}

          {serverError && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              {serverError}
            </p>
          )}

          <button type="submit" disabled={!formValid || submitting} className="btn-primary mt-5 w-full py-3">
            {submitting
              ? form.paymentMethod === "paystack"
                ? "Opening Paystack…"
                : "Placing order…"
              : form.paymentMethod === "paystack"
                ? `Pay ${formatNaira(total)} with Paystack`
                : `Place Order · ${formatNaira(total)}`}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            By placing this order you agree to our terms. Payment method:{" "}
            {PAYMENT_METHOD_LABELS[form.paymentMethod]}.
          </p>
        </aside>
      </form>
    </div>
  );
}
