/**
 * "New Arrivals / Best Sellers" split banners — mirrors the moodboard's
 * two-up section near the footer.
 */
import Link from "next/link";
import type { Product } from "@/lib/types";

function SplitBanner({
  title,
  subtitle,
  cta,
  href,
  tone,
  product,
}: {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  tone: "slate" | "emerald";
  product?: Product;
}) {
  const tones = {
    slate: "bg-slate-100",
    emerald: "bg-emerald-50",
  };
  return (
    <Link
      href={href}
      className={`${tones[tone]} group flex items-center justify-between gap-6 rounded-2xl p-7 transition hover:shadow-card`}
    >
      <div>
        <h3 className="text-xl font-extrabold text-navy">{title}</h3>
        <p className="mt-1 max-w-[220px] text-sm text-slate-500">{subtitle}</p>
        <p className="mt-4 text-sm font-semibold text-brand-600">
          {cta} <span aria-hidden className="inline-block transition group-hover:translate-x-0.5">→</span>
        </p>
      </div>
      {product?.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="h-24 w-24 shrink-0 rounded-xl object-cover shadow-sm sm:h-28 sm:w-28"
        />
      )}
    </Link>
  );
}

export default function SplitBanners({
  newArrival,
  bestSeller,
}: {
  newArrival?: Product;
  bestSeller?: Product;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
      <SplitBanner
        title="New Arrivals"
        subtitle="Fresh additions to the shelves — check what just landed."
        cta="Shop New"
        href="/shop?badge=NEW"
        tone="slate"
        product={newArrival}
      />
      <SplitBanner
        title="Best Sellers"
        subtitle="The foodstuffs our customers reorder every single week."
        cta="Shop Best Sellers"
        href="/shop?badge=BESTSELLER"
        tone="emerald"
        product={bestSeller}
      />
    </div>
  );
}
