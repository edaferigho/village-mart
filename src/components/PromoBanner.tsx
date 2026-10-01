/**
 * Wide navy promo banner ("bulk buys" callout) — mirrors the moodboard's
 * "Boost Your Productivity" banner with a photo on the right.
 */
import Link from "next/link";

export default function PromoBanner() {
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-navy-800">
      <div className="grid items-center gap-8 p-8 lg:grid-cols-2 lg:p-12">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-amber-400">BULK BUYS, BIGGER SAVINGS</p>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">Stock Up Your Kitchen for Less</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            Wholesale prices on family-size bags, cartons and jerrycans — the more you buy, the more you save.
          </p>
          <Link
            href="/shop?sort=price-desc"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-navy"
          >
            Shop Bulk Deals <span aria-hidden>→</span>
          </Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/promo-bulk.jpg"
          alt="Baskets of foodstuff at a market"
          loading="lazy"
          className="h-56 w-full rounded-xl object-cover shadow-2xl lg:h-64"
        />
      </div>
    </section>
  );
}
