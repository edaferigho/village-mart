/**
 * Admin dashboard layout — the security gate for every /admin page.
 *
 *  • Not signed in          → redirected to Google sign-in (with ?next=/admin).
 *  • Signed in, not admin   → shown a panel explaining the two ways to
 *                             become an admin (SQL promote / ADMIN_EMAILS).
 *  • Admin                  → admin sub-navigation + page content.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminUser } from "@/lib/admin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();

  if (!admin) {
    const user = await getSessionUser();
    if (!user) redirect("/login?next=/admin");

    // Signed in but not promoted yet — show self-service instructions.
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-xl card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl">
            🔒
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy">Admin access required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You&apos;re signed in as <span className="font-semibold text-navy">{user.email}</span>,
            but this account isn&apos;t an admin yet. Promote it one of two ways:
          </p>

          <div className="mt-6 space-y-4 text-left">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-navy">Option A — SQL (quick)</p>
              <p className="mt-1 text-xs text-slate-500">
                Run this in Supabase → SQL Editor after signing in once:
              </p>
              <code className="mt-2 block overflow-x-auto rounded-lg bg-navy-950 p-3 text-[11px] leading-5 text-emerald-300">
                update customers set is_admin = true where email = &apos;{user.email}&apos;;
              </code>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-navy">Option B — Environment variable</p>
              <p className="mt-1 text-xs text-slate-500">
                In Vercel → your project → Settings → Environment Variables, add{" "}
                <code className="rounded bg-slate-200 px-1 font-mono">ADMIN_EMAILS</code> with your
                email (comma-separated list for multiple admins), then redeploy.
              </p>
            </div>
          </div>

          <Link href="/" className="btn-outline mt-8">← Back to store</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-slate-100 pb-16">
      {/* Admin header band */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-600">Village Mart</p>
              <h1 className="text-2xl font-extrabold text-navy">Admin Dashboard</h1>
            </div>
            <p className="text-xs text-slate-400">
              signed in as <span className="font-semibold text-slate-600">{admin.email}</span>
            </p>
          </div>
          <div className="mt-4">
            <AdminNav />
          </div>
        </div>
      </div>

      <div className="container-page pt-8">{children}</div>
    </div>
  );
}
