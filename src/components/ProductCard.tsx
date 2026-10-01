"use client";

/**
 * Product card — image, badge chip, name, unit, price row and Add to Cart.
 * Follows the moodboard's white card with blue full-width button.
 */
import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Badge chip colors (NEW / BESTSELLER / SALE) as in the moodboard. */
const BADGE_STYLES: Record<string, string> = {
  NEW: "bg-brand-600 text-white",
  BESTSELLER: "bg-emerald-600 text-white",
  SALE: "bg-rose-600 text-white",
};

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card group flex flex-col overflow-hidden transition hover:shadow-lift">
      <Link href={`/product/${product.slug}`} className="relative block overflow-hidden bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url ?? "/images/placeholder.svg"}
          alt={product.name}
          loading="lazy"
          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {product.badge && (
          <span
            className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${BADGE_STYLES[product.badge]}`}
          >
            {product.badge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-1 text-sm font-bold text-navy transition hover:text-brand-600"
          title={product.name}
        >
          {product.name}
        </Link>
        <p className="text-xs text-slate-500">{product.unit_label}</p>

        {/* Price row: current price bold, original struck through when discounted */}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-navy">{formatNaira(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-sm text-slate-400 line-through">
              {formatNaira(product.compare_at_price)}
            </span>
          )}
        </div>

        {/* Star rating */}
        {product.rating != null && (
          <div className="flex items-center gap-1 text-amber-400" aria-label={`Rated ${product.rating} out of 5`}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M12 2l3 6.6 7 .8-5.2 4.8 1.4 7-6.2-3.6L5.8 21l1.4-7L2 9.4l7-.8L12 2z" />
            </svg>
            <span className="text-xs font-medium text-slate-500">{Number(product.rating).toFixed(1)}</span>
          </div>
        )}

        <div className="mt-auto pt-3">
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
