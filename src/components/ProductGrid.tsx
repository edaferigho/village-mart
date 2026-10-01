/**
 * Grid of product cards with responsive columns (2 → 3 → 4).
 */
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
