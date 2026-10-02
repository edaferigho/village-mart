/**
 * GET /api/products/[slug] — a single product as JSON (mobile app detail view).
 */
import { NextResponse } from "next/server";
import { getProductBySlug, getRelatedProducts } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { product, dbReady } = await getProductBySlug(params.slug);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const related = await getRelatedProducts(product.category_slug, product.id, 4);
  return NextResponse.json({ product, related, dbReady });
}
