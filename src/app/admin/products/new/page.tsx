/**
 * Admin: create a new product.
 */
import Link from "next/link";
import { getCategories } from "@/lib/data";
import ProductForm from "@/components/admin/ProductForm";
import { createProduct } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { data: categories } = await getCategories();

  return (
    <div>
      <Link href="/admin/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to products
      </Link>
      <h2 className="mb-5 mt-3 text-xl font-extrabold text-navy">Add Product</h2>
      <ProductForm action={createProduct} categories={categories} submitLabel="Add Product" />
    </div>
  );
}
