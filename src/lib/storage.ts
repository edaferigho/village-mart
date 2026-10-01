/**
 * Product image uploads to Supabase Storage.
 *
 * The admin product form sends a File through the server action; this module
 * uploads it to the PUBLIC "product-images" bucket (created by
 * supabase/migration-admin.sql) and returns its public URL, which is stored
 * in products.image_url exactly like a hand-typed path would be.
 */
import { createSupabaseClient } from "./supabase";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Max accepted upload size (5 MB — plenty for product shots). */
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Map a MIME type to a friendly file extension. */
function extensionFor(type: string): string {
  switch (type) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/avif": return "avif";
    default: return "img";
  }
}

/**
 * Upload an image for a product.
 * @returns the public URL of the uploaded image, or null when no file given.
 * @throws Error with a friendly message when the file is rejected.
 */
export async function uploadProductImage(file: File, slug: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, WebP…)");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Image is too large — pick one under 5 MB");
  }

  // Namespace by product slug + timestamp so re-uploads never collide.
  const path = `products/${slug}-${Date.now()}.${extensionFor(file.type)}`;
  const supabase = createSupabaseClient();

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (error) {
    // Common failure: the bucket/policies haven't been created yet.
    if (/bucket/i.test(error.message)) {
      throw new Error("Image storage isn't set up yet — run supabase/migration-admin.sql in Supabase first");
    }
    if (/security/i.test(error.message) || /policy/i.test(error.message)) {
      throw new Error("Upload blocked by storage policies — re-run supabase/migration-admin.sql");
    }
    console.error("product image upload failed:", error.message);
    throw new Error("Image upload failed — please try again");
  }

  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
