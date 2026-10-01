"use server";

/**
 * Admin server actions — every mutation (products, categories, promos)
 * is gated by requireAdmin(), which verifies the signed Google session and
 * the admin flag / ADMIN_EMAILS allow-list before touching Supabase.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase";
import { requireAdmin, AdminUnauthorizedError } from "@/lib/admin";
import { uploadProductImage } from "@/lib/storage";

/** Shared error/result type returned to the admin forms. */
export interface ActionState {
  error?: string;
  success?: string;
}

/** Slugify a name into a URL-safe identifier. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Turn an action error into a friendly ActionState. */
function toState(error: unknown): ActionState {
  if (error instanceof AdminUnauthorizedError) {
    return { error: "You don't have admin access." };
  }
  if (error instanceof z.ZodError) {
    return { error: error.errors[0]?.message ?? "Invalid input" };
  }
  console.error("admin action failed:", error);
  return {
    error:
      error instanceof Error
        ? error.message
        : "Something went wrong — please try again.",
  };
}

// ---------------------------------------------------------------------------
// Zod schemas (shared by create + update)
// ---------------------------------------------------------------------------

const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(150),
  slug: z.string().trim().max(150).optional(),
  brand: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  category_slug: z.string().trim().min(1, "Pick a category"),
  unit_label: z.string().trim().max(80).optional(),
  price: z.coerce.number().int("Price must be a whole number").min(0).max(10_000_000),
  compare_at_price: z.coerce.number().int().min(0).max(10_000_000).optional(),
  image_url: z.string().trim().max(500).optional(),
  badge: z.enum(["", "NEW", "BESTSELLER", "SALE"]).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(100),
  slug: z.string().trim().max(100).optional(),
  tagline: z.string().trim().max(200).optional(),
  image_url: z.string().trim().max(500).optional(),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
});

const promoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code needs at least 3 characters")
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _ only"),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce
    .number()
    .int("Value must be a whole number")
    .min(1, "Value must be at least 1")
    .max(1_000_000),
  scope: z.enum(["all", "category", "product"]),
  scope_value: z.string().trim().max(100).optional(),
  starts_at: z.string().trim().optional(),
  ends_at: z.string().trim().optional(),
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Resolve the product's image: an uploaded file wins over a pasted URL.
 * Uploads go to Supabase Storage ("product-images" public bucket).
 */
async function resolveProductImage(formData: FormData, slug: string): Promise<string | null> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    return uploadProductImage(file, slug);
  }
  const url = String(formData.get("image_url") ?? "").trim();
  return url || null;
}

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const input = productSchema.parse(Object.fromEntries(formData));

    // Generate the slug from the name unless the admin supplied one.
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!slug) return { error: "Could not build a URL slug from that name" };

    const imageUrl = await resolveProductImage(formData, slug);

    const supabase = createSupabaseClient();
    const { error } = await supabase.from("products").insert({
      name: input.name,
      slug,
      brand: input.brand || null,
      description: input.description || null,
      category_slug: input.category_slug,
      unit_label: input.unit_label || null,
      price: input.price,
      compare_at_price: input.compare_at_price ?? null,
      image_url: imageUrl,
      badge: input.badge ? input.badge : null,
      rating: input.rating ?? null,
      sort_order: input.sort_order ?? 100,
    });

    if (error) {
      if (error.code === "23505") return { error: `A product with slug "${slug}" already exists` };
      return { error: error.message };
    }

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
    redirect("/admin/products?created=" + encodeURIComponent(input.name));
  } catch (err) {
    // redirect() throws a control-flow error — let it pass through.
    if (err && typeof err === "object" && "digest" in (err as object)) throw err;
    return toState(err);
  }
}

export async function updateProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing product id" };
    const input = productSchema.parse(Object.fromEntries(formData));
    // Edit form carries the product's existing slug (hidden field) so the
    // uploaded image can be namespaced after it.
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    const imageUrl = await resolveProductImage(formData, slug);

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("products")
      .update({
        name: input.name,
        brand: input.brand || null,
        description: input.description || null,
        category_slug: input.category_slug,
        unit_label: input.unit_label || null,
        price: input.price,
        compare_at_price: input.compare_at_price ?? null,
        image_url: imageUrl,
        badge: input.badge ? input.badge : null,
        rating: input.rating ?? null,
        sort_order: input.sort_order ?? 100,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
    redirect("/admin/products?updated=" + encodeURIComponent(input.name));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in (err as object)) throw err;
    return toState(err);
  }
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const supabase = createSupabaseClient();
    await supabase.from("products").delete().eq("id", id);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
  }
  redirect("/admin/products?deleted=1");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const input = categorySchema.parse(Object.fromEntries(formData));
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!slug) return { error: "Could not build a URL slug from that name" };

    const supabase = createSupabaseClient();
    const { error } = await supabase.from("categories").insert({
      name: input.name,
      slug,
      tagline: input.tagline || null,
      image_url: input.image_url || null,
      sort_order: input.sort_order ?? 10,
    });

    if (error) {
      if (error.code === "23505") return { error: `A category with slug "${slug}" already exists` };
      return { error: error.message };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    revalidatePath("/");
    redirect("/admin/categories?created=" + encodeURIComponent(input.name));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in (err as object)) throw err;
    return toState(err);
  }
}

export async function updateCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing category id" };
    const input = categorySchema.parse(Object.fromEntries(formData));

    const supabase = createSupabaseClient();
    // NOTE: slug changes cascade to products via the ON UPDATE CASCADE FK.
    const { error } = await supabase
      .from("categories")
      .update({
        name: input.name,
        tagline: input.tagline || null,
        image_url: input.image_url || null,
        sort_order: input.sort_order ?? 10,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    revalidatePath("/");
    redirect("/admin/categories?updated=" + encodeURIComponent(input.name));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in (err as object)) throw err;
    return toState(err);
  }
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const supabase = createSupabaseClient();
    // ON DELETE CASCADE removes the category's products too.
    await supabase.from("categories").delete().eq("id", id);
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    revalidatePath("/");
  }
  redirect("/admin/categories?deleted=1");
}

// ---------------------------------------------------------------------------
// Promos
// ---------------------------------------------------------------------------

export async function createPromo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const input = promoSchema.parse(Object.fromEntries(formData));

    if (input.type === "percent" && input.value > 90) {
      return { error: "Percentage discounts cannot exceed 90%" };
    }
    if (input.scope !== "all" && !input.scope_value) {
      return { error: "Pick which category or product this code applies to" };
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase.from("promos").insert({
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value,
      scope: input.scope,
      scope_value: input.scope === "all" ? null : input.scope_value,
      starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null,
      ends_at: input.ends_at ? new Date(input.ends_at).toISOString() : null,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") return { error: `Code "${input.code.toUpperCase()}" already exists` };
      if (error.code === "PGRST205") {
        return { error: "Promos table missing — run supabase/migration-admin.sql in Supabase first" };
      }
      return { error: error.message };
    }

    revalidatePath("/admin/promos");
    redirect("/admin/promos?created=" + encodeURIComponent(input.code.toUpperCase()));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in (err as object)) throw err;
    return toState(err);
  }
}

export async function setPromoActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (id) {
    const supabase = createSupabaseClient();
    await supabase.from("promos").update({ is_active: active }).eq("id", id);
    revalidatePath("/admin/promos");
  }
  redirect("/admin/promos");
}

export async function deletePromo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const supabase = createSupabaseClient();
    await supabase.from("promos").delete().eq("id", id);
    revalidatePath("/admin/promos");
  }
  redirect("/admin/promos?deleted=1");
}
