/**
 * Admin: edit an existing category.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/data";
import CategoryForm from "@/components/admin/CategoryForm";
import { updateCategory } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const { data: categories } = await getCategories();
  const category = categories.find((c) => c.id === params.id);
  if (!category) notFound();

  return (
    <div>
      <Link href="/admin/categories" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to categories
      </Link>
      <h2 className="mb-5 mt-3 text-xl font-extrabold text-navy">Edit Category</h2>
      <CategoryForm action={updateCategory} category={category} submitLabel="Save Changes" />
    </div>
  );
}
