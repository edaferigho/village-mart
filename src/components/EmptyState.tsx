/**
 * Friendly empty / setup states.
 *
 * - `db-setup`  : the Supabase tables don't exist yet → show setup steps.
 * - `no-results`: shop/search returned nothing.
 * - `empty-cart`: the cart page with no items.
 */
import Link from "next/link";

export default function EmptyState({
  variant,
  title,
  message,
}: {
  variant: "db-setup" | "no-results" | "empty-cart";
  title?: string;
  message?: string;
}) {
  if (variant === "db-setup") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <h3 className="text-lg font-bold text-amber-800">Database setup required</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800/90">
          The catalog tables don&apos;t exist in your Supabase project yet. Open the file{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">supabase/setup.sql</code>{" "}
          from this project in your code editor, <strong>copy all of its contents</strong> (the SQL code itself,
          not the file name), then in Supabase Dashboard → SQL Editor: paste and click{" "}
          <strong>Run</strong>. Come back here and refresh — done.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-800/90">
          Prefer two smaller files instead? Run{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">supabase/schema.sql</code>{" "}
          (creates the tables) first, then{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">supabase/seed.sql</code>{" "}
          (loads the 23 demo products).
        </p>
      </div>
    );
  }

  const icon =
    variant === "empty-cart" ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-12 w-12">
        <path d="M3 9h18l-1.5 10.5A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-1.5L3 9Z" strokeLinejoin="round" />
        <path d="M8 9 12 3l4 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-12 w-12">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        <path d="M8.5 11h5" strokeLinecap="round" />
      </svg>
    );

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
      <span className="text-slate-300">{icon}</span>
      <h3 className="mt-4 text-lg font-bold text-navy">{title ?? "Nothing here yet"}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {message ?? "Check back soon — new items arrive every week."}
      </p>
      <Link href="/shop" className="btn-primary mt-6">
        Continue Shopping
      </Link>
    </div>
  );
}
