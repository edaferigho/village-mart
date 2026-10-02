/** Naira formatting shared by all screens (₦12,500). */
export function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
}
