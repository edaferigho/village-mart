/**
 * Admin: promo codes — create new ones, activate/deactivate, delete.
 * Usage stats (how many orders used each code) are shown per row.
 */
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { formatNaira } from "@/lib/format";
import { getCategories, getProducts } from "@/lib/data";
import PromoForm from "@/components/admin/PromoForm";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { createPromo, setPromoActive, deletePromo } from "../actions";
import type { Promo } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Human description of a promo's discount, e.g. "10% off" / "₦2,000 off". */
function discountLabel(promo: Promo): string {
  return promo.type === "percent" ? `${promo.value}% off` : `${formatNaira(promo.value)} off`;
}

/** Scope description, e.g. "Everything" / "Rice & Grains" / product name. */
function scopeLabel(
  promo: Promo,
  categories: { slug: string; name: string }[],
  products: { id: string; name: string }[]
): string {
  switch (promo.scope) {
    case "category":
      return categories.find((c) => c.slug === promo.scope_value)?.name ?? promo.scope_value ?? "category";
    case "product":
      return products.find((p) => p.id === promo.scope_value)?.name ?? "a product";
    default:
      return "Everything";
  }
}

export default async function AdminPromosPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const supabase = createSupabaseClient();
  const [promosRes, { data: categories }, { data: products }] = await Promise.all([
    supabase.from("promos").select("*").order("created_at", { ascending: false }),
    getCategories(),
    getProducts({ limit: 500 }),
  ]);

  const missing = isMissingSchemaError(promosRes.error);
  const promos = (promosRes.data ?? []) as Promo[];

  const { created, deleted } = searchParams;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-navy">Promos &amp; Discounts</h2>
        <p className="text-sm text-slate-500">
          Promo codes apply at checkout. For an always-on discount, edit the product and set an
          &ldquo;original price&rdquo; — the storefront shows the strikethrough + SALE treatment automatically.
        </p>
      </div>

      {(created || deleted) && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          ✓ {deleted ? "Promo deleted." : `Promo code "${created}" is live.`}
        </p>
      )}

      {missing && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          The promos table doesn&apos;t exist yet — run{" "}
          <code className="font-mono">supabase/migration-admin.sql</code> in the Supabase SQL editor first.
        </p>
      )}

      {/* Create */}
      <PromoForm action={createPromo} categories={categories} products={products} />

      {/* Existing promos */}
      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Applies to</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No promo codes yet — create the first one above.
                </td>
              </tr>
            )}
            {promos.map((promo) => {
              const now = Date.now();
              const started = !promo.starts_at || now >= new Date(promo.starts_at).getTime();
              const notEnded = !promo.ends_at || now <= new Date(promo.ends_at).getTime();
              const live = promo.is_active && started && notEnded;
              return (
                <tr key={promo.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-navy">{promo.code}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{discountLabel(promo)}</td>
                  <td className="px-4 py-3 text-slate-600">{scopeLabel(promo, categories, products)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {promo.starts_at || promo.ends_at ? (
                      <>
                        {promo.starts_at ? new Date(promo.starts_at).toLocaleDateString("en-NG") : "…"}
                        {" → "}
                        {promo.ends_at ? new Date(promo.ends_at).toLocaleDateString("en-NG") : "…"}
                      </>
                    ) : (
                      "Always"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{promo.usage_count}×</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        live ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {live ? "Live" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Pause / resume toggle */}
                      <form action={setPromoActive} className="inline">
                        <input type="hidden" name="id" value={promo.id} />
                        <input type="hidden" name="active" value={promo.is_active ? "false" : "true"} />
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          {promo.is_active ? "Pause" : "Resume"}
                        </button>
                      </form>
                      <ConfirmSubmit
                        action={deletePromo}
                        id={promo.id}
                        label="Delete"
                        message={`Delete promo code "${promo.code}"?`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
