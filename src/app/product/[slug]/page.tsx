/**
 * Product detail page — big photo on the left, purchase panel on the right,
 * followed by related products from the same category.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import EmptyState from "@/components/EmptyState";
import { formatNaira } from "@/lib/format";
import { getProductBySlug, getRelatedProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { product } = await getProductBySlug(params.slug);
  return {
    title: product ? product.name : "Product not found",
    description: product?.description ?? undefined,
  };
}

const BADGE_STYLES: Record<string, string> = {
  NEW: "bg-brand-600 text-white",
  BESTSELLER: "bg-emerald-600 text-white",
  SALE: "bg-rose-600 text-white",
};

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { product, dbReady } = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.category_slug, product.id, 4);

  return (
    <div className="container-page py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/shop?category=${product.category_slug}`} className="hover:text-brand-600">
          {product.category_slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">{product.name}</span>
      </nav>

      {/* Main product layout */}
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Photo */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url ?? "/images/placeholder.svg"}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
          {product.badge && (
            <span
              className={`absolute left-4 top-4 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${BADGE_STYLES[product.badge]}`}
            >
              {product.badge}
            </span>
          )}
        </div>

        {/* Details + purchase */}
        <div>
          {product.brand && (
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-600">{product.brand}</p>
          )}
          <h1 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-2 text-amber-400">
            {/* 5-star row scaled by rating */}
            <div className="flex" aria-hidden>
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  viewBox="0 0 24 24"
                  fill={(product.rating ?? 0) >= star - 0.25 ? "currentColor" : "#e2e8f0"}
                  className="h-4 w-4"
                >
                  <path d="M12 2l3 6.6 7 .8-5.2 4.8 1.4 7-6.2-3.6L5.8 21l1.4-7L2 9.4l7-.8L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium text-slate-500">
              {Number(product.rating ?? 0).toFixed(1)} rating
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-navy">{formatNaira(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xl text-slate-400 line-through">
                {formatNaira(product.compare_at_price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">Pack size: {product.unit_label}</p>

          {product.description && (
            <p className="mt-5 text-sm leading-7 text-slate-600">{product.description}</p>
          )}

          <ProductPurchasePanel product={product} />

          {/* Reassurance bullets */}
          <ul className="mt-7 space-y-2.5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
            <li className="flex items-center gap-2.5">
              <span className="text-brand-600">🚚</span> Same-day dispatch in Lagos, 24–48h nationwide
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-brand-600">🛡️</span> Quality guaranteed — or your money back
            </li>
            <li className="flex items-center gap-2.5">
              <span className="text-brand-600">💳</span> Pay on delivery or via bank transfer
            </li>
          </ul>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading title="You May Also Like" href={`/shop?category=${product.category_slug}`} />
          <ProductGrid products={related} />
        </section>
      )}

      {/* Defensive fallback (should never render — product exists at this point) */}
      {!dbReady && <EmptyState variant="db-setup" />}
    </div>
  );
}
