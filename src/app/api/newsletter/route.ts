/**
 * POST /api/newsletter — persist a newsletter signup in Supabase.
 * Duplicate emails are ignored (idempotent) so re-subscribing never errors.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient, isMissingSchemaError } from "@/lib/supabase";

const newsletterSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(200),
});

export async function POST(request: NextRequest) {
  let email: string;
  try {
    const parsed = newsletterSchema.parse(await request.json());
    email = parsed.email.toLowerCase();
  } catch {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email });

  if (error) {
    if (isMissingSchemaError(error)) {
      return NextResponse.json(
        { error: "Database not set up yet — run supabase/schema.sql first." },
        { status: 503 }
      );
    }
    // Unique-violation (23505) = already subscribed → treat as success.
    if (error.code !== "23505") {
      console.error("newsletter insert failed:", error.message);
      return NextResponse.json({ error: "Could not subscribe right now" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
