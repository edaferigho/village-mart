/**
 * Catalog data access — thin helpers around Supabase queries used by the
 * server components (home, shop, product detail, order pages).
 *
 * Every helper returns `dbReady: false` when the schema hasn't been applied
 * yet, so pages can render a friendly setup banner instead of crashing.
 */
import { createSupabaseClient, isMissingSchemaError } from "./supabase";
import type { Category, Product } from "./types";

/** Result wrapper used by all catalog helpers. */
interface CatalogResult<T> {
  data: T;
  dbReady: boolean;
  error?: string;
}

/** All categories, in display order. */
export async function getCategories(): Promise<CatalogResult<Category[]>> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) return { data: [], dbReady: false };
    console.error("getCategories failed:", error.message);
    return { data: [], dbReady: true, error: error.message };
  }
  return { data: (data ?? []) as Category[], dbReady: true };
}

/** Query products with optional filters used by the shop page. */
export async function getProducts(options: {
  category?: string;
  badge?: string;
  search?: string;
  sort?: string;
  limit?: number;
}): Promise<CatalogResult<Product[]>> {
  const supabase = createSupabaseClient();
  let query = supabase.from("products").select("*");

  // Optional filters from the shop page controls.
  if (options.category) query = query.eq("category_slug", options.category);
  if (options.badge) query = query.eq("badge", options.badge);
  if (options.search) {
    // Case-insensitive match on product name or brand.
    query = query.or(`name.ilike.%${options.search}%,brand.ilike.%${options.search}%`);
  }

  switch (options.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("sort_order", { ascending: true });
  }

  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) {
    if (isMissingSchemaError(error)) return { data: [], dbReady: false };
    console.error("getProducts failed:", error.message);
    return { data: [], dbReady: true, error: error.message };
  }
  return { data: (data ?? []) as Product[], dbReady: true };
}

/** A single product by slug, or null when not found. */
export async function getProductBySlug(slug: string): Promise<{
  product: Product | null;
  dbReady: boolean;
}> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return { product: null, dbReady: false };
    console.error("getProductBySlug failed:", error.message);
    return { product: null, dbReady: true };
  }
  return { product: (data as Product) ?? null, dbReady: true };
}

/** Products from the same category (for "You may also like"). */
export async function getRelatedProducts(
  categorySlug: string,
  excludeProductId: string,
  limit = 4
): Promise<Product[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_slug", categorySlug)
    .neq("id", excludeProductId)
    .limit(limit);

  if (error) {
    console.error("getRelatedProducts failed:", error.message);
    return [];
  }
  return (data ?? []) as Product[];
}
