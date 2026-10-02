/**
 * POST /api/auth/pair — create a short-lived pairing code.
 *
 * The signed-in customer (on the website) opens Account → "Connect the
 * mobile app"; this endpoint mints a 6-digit code valid for 10 minutes that
 * the mobile app can exchange for a session token bound to the SAME account.
 */
import { NextResponse } from "next/server";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

const CODE_TTL_MINUTES = 10;

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in on the website first" }, { status: 401 });

  const supabase = createSupabaseClient();
  try {
    // Remove this customer's previous codes (one live code at a time).
    await supabase.from("pairing_codes").delete().eq("customer_id", user.id);

    const code = String(crypto.randomUUID().replace(/\D/g, "").padEnd(6, "7").slice(0, 6));
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

    const { error } = await supabase
      .from("pairing_codes")
      .insert({ code, customer_id: user.id, expires_at: expiresAt });

    if (error) {
      if (isMissingSchemaError(error)) {
        return NextResponse.json(
          { error: "Pairing storage isn't set up yet — run supabase/migration-mobile.sql" },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json({ code, expiresInMinutes: CODE_TTL_MINUTES });
  } catch (err) {
    console.error("pairing code creation failed:", err);
    return NextResponse.json({ error: "Could not create a pairing code" }, { status: 500 });
  }
}
