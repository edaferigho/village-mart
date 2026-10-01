/**
 * Admin: categories list with add/edit/delete. Deleting a category also
 * removes its products (ON DELETE CASCADE in the schema).
 */
import Link from "next/link";
import { getCategories, getProducts } from "@/lib/data";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { deleteCategory } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const [{ data: categories }, { data: products }] = await Promise.all([
    getCategories(),
    getProducts({ limit: 500 }),
  ]);

  const { created, updated, deleted } = searchParams;
  const productsIn = (slug: string) => products.filter((p) => p.category_slug === slug).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-navy">Categories</h2>
          <p className="text-sm text-slate-500">{categories.length} categories · used for shop filters & product grouping</p>
        </div>
        <Link href="/admin/categories/new" className="btn-primary">+ Add Category</Link>
      </div>

      {(created || updated || deleted) && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          ✓ {deleted ? "Category deleted (its products were removed too)." : created ? `Category "${created}" added.` : `Category "${updated}" updated.`}
        </p>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={category.image_url ?? "/images/placeholder.svg"}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-semibold text-navy">{category.name}</p>
                      <p className="text-xs text-slate-400">{category.tagline}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{category.slug}</td>
                <td className="px-4 py-3 text-slate-600">{productsIn(category.slug)}</td>
                <td className="px-4 py-3 text-slate-600">{category.sort_order}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/categories/${category.id}`}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                    >
                      Edit
                    </Link>
                    <ConfirmSubmit
                      action={deleteCategory}
                      id={category.id}
                      label="Delete"
                      message={`Delete "${category.name}" AND all ${productsIn(category.slug)} products inside it?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
