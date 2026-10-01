/**
 * Shop page — the product catalog with category chips, search results
 * and sorting. Reads filters from the URL (?category=&badge=&q=&sort=).
 */
import Link from "next/link";
import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import EmptyState from "@/components/EmptyState";
import { getCategories, getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Foodstuff",
};

/** Sort options for the dropdown. */
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
];

/** Build a query string that keeps the other filters while changing one. */
function buildFilterHref(
  current: { category?: string; badge?: string; q?: string; sort?: string },
  patch: Partial<{ category?: string; badge?: string }>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  // Toggling the active chip removes the filter.
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, String(value));
  }
  return `/shop${params.size ? `?${params.toString()}` : ""}`;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { category?: string; badge?: string; q?: string; sort?: string };
}) {
  const filters = {
    category: searchParams.category,
    badge: searchParams.badge,
    search: searchParams.q, // header search box submits as ?q=
    sort: searchParams.sort ?? "featured",
  };

  const [{ data: categories, dbReady }, { data: products }] = await Promise.all([
    getCategories(),
    getProducts(filters),
  ]);

  const activeCategory = categories.find((c) => c.slug === filters.category);

  return (
    <div className="container-page py-10">
      {/* Page header / breadcrumb */}
      <nav className="text-xs text-slate-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-600">Shop</span>
        {activeCategory && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-slate-600">{activeCategory.name}</span>
          </>
        )}
      </nav>
      <h1 className="mt-2 text-3xl font-extrabold text-navy">
        {activeCategory ? activeCategory.name : "Shop All Foodstuff"}
      </h1>
      {filters.search && (
        <p className="mt-1 text-sm text-slate-500">
          Search results for <span className="font-semibold text-navy">“{filters.search}”</span>
        </p>
      )}

      {/* Filter chips + sort control */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {/* "All" chip */}
          <Link
            href={buildFilterHref(filters, { category: undefined })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              !filters.category && !filters.badge
                ? "bg-navy text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={buildFilterHref(filters, { category: category.slug })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filters.category === category.slug
                  ? "bg-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* Sort dropdown — navigates on change via the enclosing form */}
        <form action="/shop" className="flex items-center gap-2">
          {/* Preserve active filters across sorts */}
          {filters.category && <input type="hidden" name="category" value={filters.category} />}
          {filters.badge && <input type="hidden" name="badge" value={filters.badge} />}
          {filters.search && <input type="hidden" name="q" value={filters.search} />}
          <label htmlFor="sort" className="text-sm text-slate-500">Sort by</label>
          <select
            id="sort"
            name="sort"
            defaultValue={filters.sort}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-brand-600 focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="submit" className="btn-outline px-3 py-2 text-xs">Go</button>
        </form>
      </div>

      {/* Product grid */}
      <div className="mt-8">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            variant={dbReady ? "no-results" : "db-setup"}
            title={dbReady ? "No products match your filters" : undefined}
            message={dbReady ? "Try a different category or search term." : undefined}
          />
        )}
      </div>
    </div>
  );
}
