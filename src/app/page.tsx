/**
 * Home page — layout mirrors the moodboard top-to-bottom:
 * hero → trust strip → categories → Top Picks → promo banner →
 * New Arrivals / Best Sellers → newsletter.
 */
import Hero from "@/components/Hero";
import FeatureStrip from "@/components/FeatureStrip";
import CategorySection from "@/components/CategorySection";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import PromoBanner from "@/components/PromoBanner";
import SplitBanners from "@/components/SplitBanners";
import Newsletter from "@/components/Newsletter";
import EmptyState from "@/components/EmptyState";
import { getCategories, getProducts } from "@/lib/data";

// Product data lives in Supabase — always render fresh on each request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Load catalog data in parallel.
  const [{ data: categories, dbReady }, { data: products }] = await Promise.all([
    getCategories(),
    getProducts({ limit: 24 }),
  ]);

  const topPicks = products.slice(0, 8);
  const newArrival = products.find((p) => p.badge === "NEW");
  const bestSeller = products.find((p) => p.badge === "BESTSELLER");

  return (
    <>
      <Hero />
      <FeatureStrip />

      {/* Category tiles */}
      <section className="container-page py-12">
        <SectionHeading title="Shop by Category" href="/shop" linkLabel="All Categories" />
        {categories.length > 0 ? (
          <CategorySection categories={categories} />
        ) : (
          !dbReady && <EmptyState variant="db-setup" />
        )}
      </section>

      {/* Top Picks */}
      <section className="container-page pb-12">
        <SectionHeading title="Top Picks" href="/shop" />
        {products.length > 0 ? (
          <ProductGrid products={topPicks} />
        ) : (
          <EmptyState variant={dbReady ? "no-results" : "db-setup"} />
        )}
      </section>

      {/* Bulk-buy promo banner */}
      <section className="container-page pb-12">
        <PromoBanner />
      </section>

      {/* New Arrivals / Best Sellers split */}
      <section className="container-page pb-12">
        <SplitBanners newArrival={newArrival} bestSeller={bestSeller} />
      </section>

      {/* Newsletter signup */}
      <section className="container-page pb-16">
        <Newsletter />
      </section>
    </>
  );
}
