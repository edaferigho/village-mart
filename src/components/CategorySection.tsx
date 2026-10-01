/**
 * Category tiles on the home page — soft tinted cards with a photo,
 * following the moodboard's four-up category band.
 */
import Link from "next/link";
import type { Category } from "@/lib/types";

/** Rotating soft backgrounds so the tiles feel varied but cohesive. */
const TILE_STYLES = [
  "bg-brand-50",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-rose-50",
  "bg-indigo-50",
  "bg-teal-50",
  "bg-orange-50",
];

export default function CategorySection({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {categories.slice(0, 4).map((category, index) => (
        <Link
          key={category.id}
          href={`/shop?category=${category.slug}`}
          className={`${TILE_STYLES[index % TILE_STYLES.length]} group flex items-center justify-between gap-3 rounded-xl p-5 transition hover:shadow-card`}
        >
          <div>
            <h3 className="text-base font-extrabold leading-snug text-navy">{category.name}</h3>
            {category.tagline && (
              <p className="mt-1 line-clamp-2 max-w-[170px] text-xs text-slate-500">{category.tagline}</p>
            )}
            <p className="mt-3 text-sm font-semibold text-brand-600">
              Shop Now <span aria-hidden className="inline-block transition group-hover:translate-x-0.5">→</span>
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.image_url ?? "/images/placeholder.svg"}
            alt={category.name}
            loading="lazy"
            className="h-20 w-20 shrink-0 rounded-lg object-cover shadow-sm"
          />
        </Link>
      ))}
    </div>
  );
}
