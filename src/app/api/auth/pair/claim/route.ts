/**
 * POST /api/auth/pair/claim — exchange a pairing code for a session token.
 *
 * Body: { code, deviceId? }
 * The mobile app sends the 6-digit code shown on the website; the response
 * carries the same signed session token the website uses, bound to the SAME
 * customer account (same orders, same cart). When a deviceId is included the
 * guest cart is merged into the account cart.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { createSessionToken } from "@/lib/auth";
import { mergeDeviceCartIntoUserCart } from "@/lib/cart-owner";

const bodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  deviceId: z.string().regex(/^[\w-]{8,64}$/).optional(),
});

export async function POST(request: NextRequest) {
  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  try {
    const { data: pairing } = await supabase
      .from("pairing_codes")
      .select("code, customer_id, expires_at")
      .eq("code", input.code)
      .maybeSingle();

    if (!pairing || new Date(pairing.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "That code isn't valid or has expired — generate a new one on the website" },
        { status: 401 }
      );
    }

    // Load the customer this code belongs to.
    const { data: customer } = await supabase
      .from("customers")
      .select("id, email, full_name, avatar_url")
      .eq("id", pairing.customer_id)
      .maybeSingle();

    if (!customer) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // One-time use: burn the code.
    await supabase.from("pairing_codes").delete().eq("code", input.code);

    // Merge the guest device cart into the account cart.
    if (input.deviceId) {
      await mergeDeviceCartIntoUserCart(input.deviceId, customer.id);
    }

    const token = await createSessionToken({
      id: customer.id,
      email: customer.email,
      name: customer.full_name ?? "Customer",
      picture: customer.avatar_url ?? null,
    });

    return NextResponse.json({
      token,
      user: {
        id: customer.id,
        email: customer.email,
        name: customer.full_name ?? "Customer",
        picture: customer.avatar_url ?? null,
      },
    });
  } catch (err) {
    if (isMissingSchemaError(err)) {
      return NextResponse.json(
        { error: "Pairing storage isn't set up yet — run supabase/migration-mobile.sql" },
        { status: 503 }
      );
    }
    console.error("pairing claim failed:", err);
    return NextResponse.json({ error: "Could not sign you in" }, { status: 500 });
  }
}
