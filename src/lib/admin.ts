/**
 * Admin authorization gate.
 *
 * A signed-in Google customer is an admin when EITHER:
 *   • their email is listed in the ADMIN_EMAILS env var (comma-separated), OR
 *   • their Supabase `customers` row has `is_admin = true` (set via SQL).
 *
 * Every admin page and every admin server action funnels through
 * `getAdminUser()` / `requireAdmin()` — the database itself cannot enforce
 * this because the storefront writes with the publishable key (demo RLS),
 * so this app-layer check is the security boundary.
 */
import { createSupabaseClient } from "./supabase";
import { getSessionUser } from "./auth";
import type { SessionUser } from "./types";

/** Emails granted admin by environment (ADMIN_EMAILS="a@x.com, b@y.com"). */
function envAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve the signed-in admin, or null.
 * Safe to call from server components and server actions.
 */
export async function getAdminUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;

  // Fast path: email allow-listed in the environment.
  if (envAdminEmails().includes(user.email.toLowerCase())) return user;

  // Otherwise consult the customer's is_admin flag in Supabase.
  const supabase = createSupabaseClient();
  const { data } = await supabase
    .from("customers")
    .select("is_admin")
    .eq("email", user.email)
    .maybeSingle();

  return data?.is_admin === true ? user : null;
}

/** Thrown by admin server actions when the caller is not an admin. */
export class AdminUnauthorizedError extends Error {
  constructor() {
    super("Admin access required");
  }
}

/** Guard for server actions — throws AdminUnauthorizedError when not admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const admin = await getAdminUser();
  if (!admin) throw new AdminUnauthorizedError();
  return admin;
}

/** True when the user is signed in but lacks admin rights (for nicer UX). */
export async function isSignedInButNotAdmin(): Promise<boolean> {
  const [user, admin] = await Promise.all([getSessionUser(), getAdminUser()]);
  return user !== null && admin === null;
}
