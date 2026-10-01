"use client";

/**
 * Shopping cart page — line items with quantity steppers, remove buttons,
 * subtotal + delivery summary and a "Proceed to Checkout" CTA.
 */
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { deliveryFeeFor, formatNaira, amountToFreeDelivery, FREE_DELIVERY_THRESHOLD } from "@/lib/format";
import EmptyState from "@/components/EmptyState";

export default function CartPage() {
  const { items, subtotal, isReady, setQuantity, removeItem, clearCart } = useCart();

  // Avoid flashing the empty state before localStorage hydration finishes.
  if (!isReady) {
    return <div className="container-page py-16" aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <h1 className="mb-8 text-3xl font-extrabold text-navy">Your Cart</h1>
        <EmptyState
          variant="empty-cart"
          title="Your cart is empty"
          message="Add some foodstuff to your cart and it will show up here."
        />
      </div>
    );
  }

  const deliveryFee = deliveryFeeFor(subtotal);
  const toFreeDelivery = amountToFreeDelivery(subtotal);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold text-navy">Your Cart</h1>
      <p className="mt-1 text-sm text-slate-500">
        {items.length} item{items.length !== 1 && "s"} in your cart
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Line items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="card flex gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl || "/images/placeholder.svg"}
                alt={item.name}
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
              />
              <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`/product/${item.slug}`}
                    className="text-sm font-bold text-navy hover:text-brand-600"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-500">{item.unitLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-navy">{formatNaira(item.price)}</p>
                </div>

                <div className="mt-3 flex items-center gap-4 sm:mt-0">
                  {/* Quantity stepper */}
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-slate-500 hover:text-navy"
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      −
                    </button>
                    <span className="w-9 border-x border-slate-300 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center text-slate-500 hover:text-navy"
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="w-24 text-right text-sm font-extrabold text-navy">
                    {formatNaira(item.price * item.quantity)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-slate-400 transition hover:text-rose-600"
                    aria-label={`Remove ${item.name} from cart`}
                    title="Remove"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.8 12a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Link href="/shop" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="text-sm font-medium text-slate-400 hover:text-rose-600"
            >
              Clear cart
            </button>
          </div>
        </div>

        {/* Order summary */}
        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold text-navy">Order Summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold text-navy">{formatNaira(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery fee</dt>
              <dd className="font-semibold text-navy">
                {deliveryFee === 0 ? <span className="text-emerald-600">FREE</span> : formatNaira(deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-bold text-navy">Total</dt>
              <dd className="font-extrabold text-brand-600">{formatNaira(subtotal + deliveryFee)}</dd>
            </div>
          </dl>

          {toFreeDelivery > 0 && (
            <p className="mt-4 rounded-lg bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700">
              Add {formatNaira(toFreeDelivery)} more to unlock free delivery (orders above{" "}
              {formatNaira(FREE_DELIVERY_THRESHOLD)}).
            </p>
          )}

          <Link href="/checkout" className="btn-primary mt-5 w-full py-3">
            Proceed to Checkout
          </Link>
          <p className="mt-3 text-center text-xs text-slate-400">
            Secure checkout · Pay on delivery available
          </p>
        </aside>
      </div>
    </div>
  );
}
