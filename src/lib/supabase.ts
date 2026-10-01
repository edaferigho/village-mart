/**
 * Supabase client factory.
 *
 * Every table read/write in the app goes through this module. We use the
 * project URL + publishable (anon) key from the environment — the same keys
 * found in the "API keys/superbasekey.txt" file — and rely on permissive RLS
 * policies defined in `supabase/schema.sql` for this demo storefront.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Fail loudly and early — the app cannot talk to the DB without these. */
function requireEnv(): { url: string; key: string } {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Copy .env.example to .env.local and fill in the values."
    );
  }
  return { url: supabaseUrl, key: supabaseKey };
}

/**
 * Create a Supabase client.
 *
 * Sessions are managed by our own signed cookie (see lib/auth.ts), so we tell
 * supabase-js not to persist any auth session of its own.
 */
export function createSupabaseClient(): SupabaseClient {
  const { url, key } = requireEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * True when the error looks like "the tables don't exist yet" — used to show
 * a friendly "run supabase/schema.sql" setup banner instead of a raw error.
 */
export function isMissingSchemaError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return (
    e.code === "PGRST205" || // "Could not find the table ... in the schema cache"
    e.code === "42P01" || //    Postgres: relation does not exist
    (e.message ?? "").toLowerCase().includes("could not find the table")
  );
}
