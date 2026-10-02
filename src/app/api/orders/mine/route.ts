/**
 * GET /api/orders/mine — the signed-in customer's order history.
 * Works with the website session cookie AND the mobile app's Bearer token.
 */
import { NextResponse } from "next/server";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { resolveRequestUser } from "@/lib/auth-request";

export async function GET() {
  const user = await resolveRequestUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) {
      return NextResponse.json({ error: "Database not set up yet" }, { status: 503 });
    }
    console.error("orders/mine failed:", error.message);
    return NextResponse.json({ error: "Could not load your orders" }, { status: 500 });
  }
  return NextResponse.json({ orders: data ?? [] });
}
