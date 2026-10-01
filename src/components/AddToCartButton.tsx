"use client";

/**
 * Add-to-cart button with a brief "added" confirmation state.
 * Used on product cards and the product detail page.
 */
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/types";

export default function AddToCartButton({
  product,
  quantity = 1,
  size = "md",
}: {
  product: Product;
  quantity?: number;
  size?: "md" | "lg";
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`btn-primary w-full ${size === "lg" ? "py-3 text-base" : ""}`}
    >
      {added ? (
        <>Added ✓</>
      ) : (
        <>
          {/* Cart glyph on the button, like the moodboard cards */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M3 9h18l-1.5 10.5A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-1.5L3 9Z" strokeLinejoin="round" />
            <path d="M8 9 12 3l4 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add to Cart
        </>
      )}
    </button>
  );
}
