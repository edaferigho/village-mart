/**
 * Account page — profile chip + the signed-in customer's order history.
 * Requires a session; guests are redirected to /login?next=/account.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { formatNaira } from "@/lib/format";
import { ORDER_STATUS_STYLES } from "@/lib/constants";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  // Orders linked to this customer (guest orders placed with the same email
  // are intentionally NOT shown — only Google-linked orders live here).
  const supabase = createSupabaseClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const typedOrders = (orders ?? []) as Order[];
  const totalSpent = typedOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.picture} alt={user.name} className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-600">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Hello, {user.name.split(" ")[0]} 👋</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          {/* Sign out — posts to the signout route which clears the session */}
          <a href="/api/auth/signout" className="btn-outline ml-auto px-4 py-2 text-xs">
            Sign out
          </a>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total orders</p>
            <p className="mt-1 text-3xl font-extrabold text-navy">{typedOrders.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total spent</p>
            <p className="mt-1 text-3xl font-extrabold text-navy">{formatNaira(totalSpent)}</p>
          </div>
        </div>

        {/* Order history */}
        <h2 className="mt-10 text-xl font-extrabold text-navy">Order History</h2>

        {error && !isMissingSchemaError(error) && (
          <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Couldn&apos;t load your orders: {error.message}
          </p>
        )}

        {typedOrders.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-sm text-slate-500">You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="btn-primary mt-4">Start Shopping</Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {typedOrders.map((order) => {
              const status = ORDER_STATUS_STYLES[order.status] ?? ORDER_STATUS_STYLES.pending;
              const itemCount = (order.order_items ?? []).reduce((sum, i) => sum + i.quantity, 0);
              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="card flex flex-wrap items-center gap-4 p-5 transition hover:shadow-lift"
                >
                  <div className="min-w-[180px] flex-1">
                    <p className="text-sm font-extrabold text-navy">#{order.order_number}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {itemCount} item{itemCount !== 1 && "s"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
                    {status.label}
                  </span>
                  <p className="text-base font-extrabold text-navy">{formatNaira(order.total)}</p>
                  <span aria-hidden className="text-slate-400">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
