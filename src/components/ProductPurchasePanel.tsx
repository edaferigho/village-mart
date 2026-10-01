"use client";

/**
 * Quantity selector + Add to Cart pair used on the product detail page.
 */
import { useState } from "react";
import AddToCartButton from "./AddToCartButton";
import type { Product } from "@/lib/types";

export default function ProductPurchasePanel({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {/* Quantity stepper */}
      <div className="flex items-center rounded-lg border border-slate-300">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="flex h-11 w-11 items-center justify-center text-lg font-bold text-slate-500 transition hover:text-navy"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            setQuantity(Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(99, parsed)));
          }}
          className="h-11 w-12 border-x border-slate-300 text-center text-sm font-bold text-navy focus:outline-none"
          aria-label="Quantity"
        />
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(99, q + 1))}
          className="flex h-11 w-11 items-center justify-center text-lg font-bold text-slate-500 transition hover:text-navy"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className="min-w-[200px] flex-1">
        <AddToCartButton product={product} quantity={quantity} size="lg" />
      </div>
    </div>
  );
}
