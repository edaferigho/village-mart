/**
 * Admin: create a new category.
 */
import Link from "next/link";
import CategoryForm from "@/components/admin/CategoryForm";
import { createCategory } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  return (
    <div>
      <Link href="/admin/categories" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to categories
      </Link>
      <h2 className="mb-5 mt-3 text-xl font-extrabold text-navy">Add Category</h2>
      <CategoryForm action={createCategory} submitLabel="Add Category" />
    </div>
  );
}
