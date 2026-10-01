"use client";

/**
 * Category create/edit form used by the admin dashboard.
 */
import { useFormState } from "react-dom";
import type { Category } from "@/lib/types";
import type { ActionState } from "@/app/admin/actions";

const EMPTY: ActionState = {};

export default function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  category?: Category;
  submitLabel: string;
}) {
  const [rawState, formAction, pending] = useFormState(action, EMPTY);
  // After a redirect the action returns no state — guard against undefined.
  const state = rawState ?? EMPTY;

  return (
    <form action={formAction} className="card max-w-2xl p-6">
      {category && <input type="hidden" name="id" value={category.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cat-name" className="label">Category name *</label>
          <input id="cat-name" name="name" required defaultValue={category?.name} className="input" placeholder="Rice & Grains" />
        </div>

        {!category && (
          <div>
            <label htmlFor="cat-slug" className="label">
              URL slug <span className="font-normal text-slate-400">(auto if blank)</span>
            </label>
            <input id="cat-slug" name="slug" className="input" placeholder="rice-grains" />
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="cat-tagline" className="label">Tagline</label>
          <input id="cat-tagline" name="tagline" defaultValue={category?.tagline ?? ""} className="input" placeholder="Bags of rice, beans & swallow staples" />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="cat-image" className="label">Tile image URL or path</label>
          <input id="cat-image" name="image_url" defaultValue={category?.image_url ?? ""} className="input" placeholder="/images/cat-rice-grains.jpg" />
        </div>

        <div>
          <label htmlFor="cat-sort" className="label">Display order</label>
          <input id="cat-sort" name="sort_order" type="number" min="0" step="1" defaultValue={category?.sort_order != null ? String(category.sort_order) : "10"} className="input" />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
        <a href="/admin/categories" className="btn-outline">Cancel</a>
      </div>
    </form>
  );
}
