/**
 * /api/cart — the server-side shopping cart shared by the website and the
 * mobile app.
 *
 *   GET    /api/cart                  → lines (joined with product info) + ownerKey
 *   POST   /api/cart                  → { productId, quantity } upsert (0 removes)
 *   DELETE /api/cart?productId=<uuid> → remove one line
 *   DELETE /api/cart                  → clear the whole cart
 *   POST   /api/cart/merge            → { deviceId } merge a guest cart (sign-in)
 *
 * Ownership: signed-in session (cookie or bearer) → `user:<id>`;
 * otherwise the guest `vm_device` cookie → `device:<id>`.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";
import { resolveCartOwner, mergeDeviceCartIntoUserCart } from "@/lib/cart-owner";
import { resolveRequestUser } from "@/lib/auth-request";

const MISSING = {
  error: "Cart storage isn't set up yet — run supabase/migration-mobile.sql in the Supabase SQL editor",
};

const upsertSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0).max(99),
});

const mergeSchema = z.object({
  deviceId: z.string().regex(/^[\w-]{8,64}$/),
});

/** Fetch the owner's cart lines with product details attached. */
async function readCart(ownerKey: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select("id, quantity, product_id, product:products(id, slug, name, price, image_url, unit_label)")
    .eq("owner_key", ownerKey)
    .order("updated_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const typed = row as unknown as {
      id: string;
      quantity: number;
      product_id: string;
      product: {
        id: string; slug: string; name: string; price: number;
        image_url: string | null; unit_label: string | null;
      } | null;
    };
    return {
      lineId: typed.id,
      productId: typed.product_id,
      quantity: typed.quantity,
      product: typed.product,
    };
  });
}

export async function GET() {
  const owner = await resolveCartOwner();
  if (!owner) return NextResponse.json({ items: [], ownerKey: null });
  try {
    const items = await readCart(owner.ownerKey);
    return NextResponse.json({ items, ownerKey: owner.ownerKey });
  } catch (err) {
    if (isMissingSchemaError(err)) return NextResponse.json(MISSING, { status: 503 });
    console.error("cart GET failed:", err);
    return NextResponse.json({ error: "Could not load your cart" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const owner = await resolveCartOwner();
  if (!owner) return NextResponse.json({ error: "No cart identity" }, { status: 400 });

  let input: z.infer<typeof upsertSchema>;
  try {
    input = upsertSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid cart update" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  try {
    if (input.quantity <= 0) {
      await supabase
        .from("cart_items")
        .delete()
        .eq("owner_key", owner.ownerKey)
        .eq("product_id", input.productId);
    } else {
      const { error } = await supabase.from("cart_items").upsert(
        {
          owner_key: owner.ownerKey,
          product_id: input.productId,
          quantity: input.quantity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_key,product_id" }
      );
      if (error) throw error;
    }
    const items = await readCart(owner.ownerKey);
    return NextResponse.json({ items, ownerKey: owner.ownerKey });
  } catch (err) {
    if (isMissingSchemaError(err)) return NextResponse.json(MISSING, { status: 503 });
    console.error("cart POST failed:", err);
    return NextResponse.json({ error: "Could not update your cart" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const owner = await resolveCartOwner();
  if (!owner) return NextResponse.json({ error: "No cart identity" }, { status: 400 });

  const productId = request.nextUrl.searchParams.get("productId");
  const supabase = createSupabaseClient();
  try {
    if (productId) {
      await supabase
        .from("cart_items")
        .delete()
        .eq("owner_key", owner.ownerKey)
        .eq("product_id", productId);
    } else {
      await supabase.from("cart_items").delete().eq("owner_key", owner.ownerKey);
    }
    const items = await readCart(owner.ownerKey);
    return NextResponse.json({ items, ownerKey: owner.ownerKey });
  } catch (err) {
    if (isMissingSchemaError(err)) return NextResponse.json(MISSING, { status: 503 });
    console.error("cart DELETE failed:", err);
    return NextResponse.json({ error: "Could not update your cart" }, { status: 500 });
  }
}

/** Merge a guest device cart into the signed-in user's cart. */
export async function PUT(request: NextRequest) {
  const user = await resolveRequestUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  let deviceId: string;
  try {
    deviceId = mergeSchema.parse(await request.json()).deviceId;
  } catch {
    return NextResponse.json({ error: "Invalid device id" }, { status: 400 });
  }

  try {
    await mergeDeviceCartIntoUserCart(deviceId, user.id);
    const items = await readCart(`user:${user.id}`);
    return NextResponse.json({ items, ownerKey: `user:${user.id}` });
  } catch (err) {
    if (isMissingSchemaError(err)) return NextResponse.json(MISSING, { status: 503 });
    console.error("cart merge failed:", err);
    return NextResponse.json({ error: "Could not merge carts" }, { status: 500 });
  }
}
