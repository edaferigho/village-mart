/**
 * GET /api/auth/me — returns the current session user (or { user: null }).
 * Used by client pages (e.g. checkout) to prefill contact details.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
