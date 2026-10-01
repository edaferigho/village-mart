/**
 * Admin: products list with prices, discounts, badges and edit/delete actions.
 */
import Link from "next/link";
import { getProducts } from "@/lib/data";
import { formatNaira } from "@/lib/format";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { deleteProduct } from "../actions";

export const dynamic = "force-dynamic";

const BADGE_STYLES: Record<string, string> = {
  NEW: "bg-brand-600 text-white",
  BESTSELLER: "bg-emerald-600 text-white",
  SALE: "bg-rose-600 text-white",
};

/** Green notice line when an action redirected back with ?created/&updated/&deleted. */
function Notice({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const { created, updated, deleted } = searchParams;
  if (!created && !updated && !deleted) return null;
  const text = deleted
    ? "Product deleted."
    : created
      ? `Product "${created}" added to the catalog.`
      : `Product "${updated}" updated.`;
  return (
    <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      ✓ {text}
    </p>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const { data: products } = await getProducts({ limit: 500 });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-navy">Products</h2>
          <p className="text-sm text-slate-500">{products.length} items in the catalog</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">+ Add Product</Link>
      </div>

      <Notice searchParams={searchParams} />

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Badge</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => {
              const discounted = product.compare_at_price && product.compare_at_price > product.price;
              return (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image_url ?? "/images/placeholder.svg"}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-semibold text-navy">{product.name}</p>
                        <p className="text-xs text-slate-400">{product.unit_label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{product.category_slug.replace(/-/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-navy">{formatNaira(product.price)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {discounted ? (
                      <span className="text-slate-500">
                        <span className="line-through">{formatNaira(product.compare_at_price!)}</span>{" "}
                        <span className="font-semibold text-emerald-600">
                          −{Math.round((1 - product.price / product.compare_at_price!) * 100)}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {product.badge ? (
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${BADGE_STYLES[product.badge]}`}>
                        {product.badge}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                      >
                        Edit
                      </Link>
                      <ConfirmSubmit
                        action={deleteProduct}
                        id={product.id}
                        label="Delete"
                        message={`Delete "${product.name}"? This cannot be undone.`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
