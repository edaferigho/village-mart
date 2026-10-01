/**
 * Admin: edit an existing product (price, discount, badge, details).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/data";
import ProductForm from "@/components/admin/ProductForm";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { updateProduct, deleteProduct } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [{ data: categories }, { data: products }] = await Promise.all([
    getCategories(),
    getProducts({ limit: 500 }),
  ]);

  const product = products.find((p) => p.id === params.id);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to products
      </Link>
      <div className="mb-5 mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-navy">Edit Product</h2>
        <ConfirmSubmit
          action={deleteProduct}
          id={product.id}
          label="Delete product"
          message={`Delete "${product.name}"? This cannot be undone.`}
        />
      </div>
      <ProductForm action={updateProduct} categories={categories} product={product} submitLabel="Save Changes" />
    </div>
  );
}
