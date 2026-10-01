"use client";

/**
 * Promo code creation form.
 * The "applies to" select switches between the whole store, a single
 * category, or a single product depending on the chosen scope.
 */
import { useFormState } from "react-dom";
import { useState } from "react";
import type { Category, Product } from "@/lib/types";
import type { ActionState } from "@/app/admin/actions";

const EMPTY: ActionState = {};

export default function PromoForm({
  action,
  categories,
  products,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  products: Product[];
}) {
  const [rawState, formAction, pending] = useFormState(action, EMPTY);
  // After a redirect the action returns no state — guard against undefined.
  const state = rawState ?? EMPTY;
  const [scope, setScope] = useState<"all" | "category" | "product">("all");

  return (
    <form action={formAction} className="card p-6">
      <h3 className="text-lg font-extrabold text-navy">Create a Promo Code</h3>
      <p className="mt-1 text-xs text-slate-500">
        Shoppers enter this code at checkout. Percentage codes take % off; fixed codes take a flat ₦ off.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="promo-code" className="label">Code *</label>
          <input
            id="promo-code"
            name="code"
            required
            className="input font-mono uppercase"
            placeholder="JOLLOF10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="promo-type" className="label">Type *</label>
            <select id="promo-type" name="type" className="input" defaultValue="percent">
              <option value="percent">% off</option>
              <option value="fixed">₦ off</option>
            </select>
          </div>
          <div>
            <label htmlFor="promo-value" className="label">Value *</label>
            <input id="promo-value" name="value" type="number" min="1" step="1" required className="input" placeholder="10" />
          </div>
        </div>

        <div>
          <label htmlFor="promo-scope" className="label">Applies to *</label>
          <select
            id="promo-scope"
            name="scope"
            className="input"
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
          >
            <option value="all">Everything in the store</option>
            <option value="category">One category</option>
            <option value="product">One product</option>
          </select>
        </div>

        <div>
          <label htmlFor="promo-scope-value" className="label">
            {scope === "category" ? "Category *" : scope === "product" ? "Product *" : "Scope target"}
          </label>
          {scope === "all" ? (
            <input disabled className="input bg-slate-50 text-slate-400" value="All products" />
          ) : scope === "category" ? (
            <select id="promo-scope-value" name="scope_value" required className="input">
              <option value="" disabled>Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          ) : (
            <select id="promo-scope-value" name="scope_value" required className="input">
              <option value="" disabled>Choose…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="promo-starts" className="label">Starts at <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="promo-starts" name="starts_at" type="datetime-local" className="input" />
        </div>

        <div>
          <label htmlFor="promo-ends" className="label">Ends at <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="promo-ends" name="ends_at" type="datetime-local" className="input" />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-6">
        {pending ? "Creating…" : "Create Promo Code"}
      </button>
    </form>
  );
}
