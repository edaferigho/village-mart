/**
 * GET /api/products — public JSON catalog for the mobile app (and anything
 * else that wants the same data). Supports the same filters as the shop:
 * ?category=&q=&badge=&sort=&limit=
 */
import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await getProducts({
    category: searchParams.get("category") ?? undefined,
    badge: searchParams.get("badge") ?? undefined,
    search: searchParams.get("q") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  });

  return NextResponse.json({ products: result.data, dbReady: result.dbReady });
}
