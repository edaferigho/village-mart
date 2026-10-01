/**
 * Admin dashboard — the store at a glance:
 *   • KPI cards (revenue, orders, units sold, active promos)
 *   • Best-sellers table (products ranked by units sold + revenue share bars)
 *   • Recent orders feed
 *
 * All figures are aggregated in-memory from the orders/order_items tables,
 * which is plenty for a storefront at this scale.
 */
import Link from "next/link";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { formatNaira } from "@/lib/format";
import { ORDER_STATUS_STYLES } from "@/lib/constants";
import type { Order, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

/** One row in the best-sellers table. */
interface BestSeller {
  productId: string;
  name: string;
  units: number;
  revenue: number;
}

export default async function AdminDashboardPage() {
  const supabase = createSupabaseClient();

  const [ordersRes, promosRes, productsRes] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
    supabase.from("promos").select("*").eq("is_active", true),
    supabase.from("products").select("id, name, price"),
  ]);

  if (isMissingSchemaError(ordersRes.error)) {
    return (
      <div className="card p-8 text-sm text-slate-600">
        Database not set up yet — run <code className="font-mono">supabase/setup.sql</code> in the
        Supabase SQL editor.
      </div>
    );
  }

  const orders = (ordersRes.data ?? []) as Order[];
  const activePromos = (promosRes.data ?? []).length;
  const productNames = new Map(
    ((productsRes.data ?? []) as Pick<Product, "id" | "name">[]).map((p) => [p.id, p.name])
  );

  // ---- KPIs ---------------------------------------------------------------
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const unitsSold = orders.reduce(
    (sum, o) => sum + (o.order_items ?? []).reduce((s, i) => s + i.quantity, 0),
    0
  );
  const avgOrder = orders.length ? Math.round(revenue / orders.length) : 0;

  // ---- Best sellers (units sold per product, across all orders) -----------
  const unitsByProduct = new Map<string, number>();
  const revenueByProduct = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      if (!item.product_id) continue;
      unitsByProduct.set(item.product_id, (unitsByProduct.get(item.product_id) ?? 0) + item.quantity);
      revenueByProduct.set(
        item.product_id,
        (revenueByProduct.get(item.product_id) ?? 0) + item.line_total
      );
    }
  }
  const bestSellers: BestSeller[] = [...unitsByProduct.entries()]
    .map(([productId, units]) => ({
      productId,
      units,
      revenue: revenueByProduct.get(productId) ?? 0,
      name: productNames.get(productId) ?? "Deleted product",
    }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);
  const maxUnits = bestSellers[0]?.units ?? 0;

  const KPIS = [
    { label: "Total revenue", value: formatNaira(revenue), hint: `${orders.length} orders` },
    { label: "Units sold", value: String(unitsSold), hint: "across all orders" },
    { label: "Average order", value: formatNaira(avgOrder), hint: "per checkout" },
    { label: "Active promos", value: String(activePromos), hint: "codes running now" },
  ];

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{kpi.label}</p>
            <p className="mt-1.5 text-3xl font-extrabold text-navy">{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-400">{kpi.hint}</p>
          </div>
        ))}
      </div>

      {/* Best sellers */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-navy">Best Sellers</h2>
          <span className="text-xs text-slate-400">ranked by units sold</span>
        </div>

        {bestSellers.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No sales yet — place a test order to see this table fill up.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {bestSellers.map((row, index) => (
              <li key={row.productId} className="flex items-center gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-600">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-navy">{row.name}</p>
                    <p className="shrink-0 text-sm text-slate-500">
                      <span className="font-bold text-navy">{row.units}</span> sold ·{" "}
                      {formatNaira(row.revenue)}
                    </p>
                  </div>
                  {/* Revenue-share bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${Math.max(4, Math.round((row.units / maxUnits) * 100))}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Recent orders */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-navy">Recent Orders</h2>
          <span className="text-xs text-slate-400">latest {Math.min(8, orders.length)}</span>
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No orders yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {orders.slice(0, 8).map((order) => {
              const status = ORDER_STATUS_STYLES[order.status] ?? ORDER_STATUS_STYLES.pending;
              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="flex flex-wrap items-center gap-3 py-3 transition hover:bg-slate-50"
                >
                  <span className="min-w-[110px] text-sm font-bold text-navy">#{order.order_number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                    {order.customer_name} · {order.customer_email}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}>
                    {status.label}
                  </span>
                  {order.payment_status === "paid" && (
                    <span
                      className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"
                      title="Paid via Paystack"
                    >
                      💳 Paid
                    </span>
                  )}
                  <span className="text-sm font-extrabold text-navy">{formatNaira(order.total)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
