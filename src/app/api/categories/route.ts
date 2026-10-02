/**
 * GET /api/categories — public category list for the mobile app.
 */
import { NextResponse } from "next/server";
import { getCategories } from "@/lib/data";

export async function GET() {
  const result = await getCategories();
  return NextResponse.json({ categories: result.data, dbReady: result.dbReady });
}
