"use client";

/**
 * Product create/edit form used by the admin dashboard.
 * The server action is passed in as a prop (server actions are serializable
 * references), and useFormState wires validation errors + pending state.
 */
import { useFormState } from "react-dom";
import { useState } from "react";
import type { Category, Product } from "@/lib/types";
import type { ActionState } from "@/app/admin/actions";

const EMPTY: ActionState = {};

export default function ProductForm({
  action,
  categories,
  product,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  product?: Product; // present in edit mode
  submitLabel: string;
}) {
  const [rawState, formAction, pending] = useFormState(action, EMPTY);
  // After a redirect the action returns no state — guard against undefined.
  const state = rawState ?? EMPTY;
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  // Local object-URL preview of a freshly chosen file (wins over imageUrl).
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const previewSrc = filePreview ?? (imageUrl || "/images/placeholder.svg");

  const priceValue = product?.price != null ? String(product.price) : "";
  const compareValue = product?.compare_at_price != null ? String(product.compare_at_price) : "";

  return (
    <form action={formAction} className="card max-w-3xl p-6">
      {product && (
        <>
          <input type="hidden" name="id" value={product.id} />
          {/* Existing slug rides along so uploaded images are namespaced by it */}
          <input type="hidden" name="slug" value={product.slug} />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="label">Product name *</label>
          <input id="name" name="name" required defaultValue={product?.name} className="input" placeholder="Golden Penny Spaghetti" />
        </div>

        {!product && (
          <div>
            <label htmlFor="slug" className="label">
              URL slug <span className="font-normal text-slate-400">(auto-generated if blank)</span>
            </label>
            <input id="slug" name="slug" className="input" placeholder="golden-penny-spaghetti" />
          </div>
        )}

        <div>
          <label htmlFor="brand" className="label">Brand</label>
          <input id="brand" name="brand" defaultValue={product?.brand ?? ""} className="input" placeholder="Golden Penny" />
        </div>

        <div>
          <label htmlFor="category_slug" className="label">Category *</label>
          <select id="category_slug" name="category_slug" required defaultValue={product?.category_slug} className="input">
            <option value="" disabled>Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="unit_label" className="label">Pack size / unit</label>
          <input id="unit_label" name="unit_label" defaultValue={product?.unit_label ?? ""} className="input" placeholder="500g × 10" />
        </div>

        {/* Prices — whole Naira. compare_at_price is the "original" price that
            makes the current price read as a discount (strikethrough on cards). */}
        <div>
          <label htmlFor="price" className="label">Selling price (₦) *</label>
          <input id="price" name="price" type="number" min="0" step="1" required defaultValue={priceValue} className="input" placeholder="8200" />
        </div>

        <div>
          <label htmlFor="compare_at_price" className="label">
            Original price (₦) <span className="font-normal text-slate-400">(optional — shows as a strikethrough discount)</span>
          </label>
          <input id="compare_at_price" name="compare_at_price" type="number" min="0" step="1" defaultValue={compareValue} className="input" placeholder="9200" />
        </div>

        <div>
          <label htmlFor="badge" className="label">Badge</label>
          <select id="badge" name="badge" defaultValue={product?.badge ?? ""} className="input">
            <option value="">No badge</option>
            <option value="NEW">NEW</option>
            <option value="BESTSELLER">BESTSELLER</option>
            <option value="SALE">SALE</option>
          </select>
        </div>

        <div>
          <label htmlFor="rating" className="label">Rating (0–5)</label>
          <input id="rating" name="rating" type="number" min="0" max="5" step="0.1" defaultValue={product?.rating != null ? String(product.rating) : ""} className="input" placeholder="4.5" />
        </div>

        <div>
          <label htmlFor="sort_order" className="label">Display order</label>
          <input id="sort_order" name="sort_order" type="number" min="0" step="1" defaultValue={product?.sort_order != null ? String(product.sort_order) : "100"} className="input" />
        </div>

        <div className="sm:col-span-2">
          {/* Primary: upload an image file (goes to Supabase Storage) */}
          <label htmlFor="image" className="label">Product image</label>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <input
                id="image"
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  // Revoke the previous preview to free memory
                  if (filePreview) URL.revokeObjectURL(filePreview);
                  setFilePreview(file ? URL.createObjectURL(file) : null);
                }}
                className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-500 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                JPG, PNG, WebP or GIF · up to 5 MB. Uploaded to Supabase Storage automatically.
              </p>
            </div>
            {/* Live preview: chosen file → pasted URL → existing image */}
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="Preview" className="h-full w-full object-cover" />
            </div>
          </div>

          {/* Secondary: paste an existing image path/URL instead */}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
              …or use an existing image URL instead
            </summary>
            <input
              aria-label="Image URL"
              name="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="input mt-2"
              placeholder="/images/products/existing-photo.jpg"
            />
          </details>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="label">Description</label>
          <textarea id="description" name="description" rows={3} defaultValue={product?.description ?? ""} className="input" placeholder="What makes this product great?" />
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
        <a href="/admin/products" className="btn-outline">Cancel</a>
      </div>
    </form>
  );
}
