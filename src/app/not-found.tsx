/**
 * Friendly 404 page.
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="text-7xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-navy">This shelf is empty</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">Back to Home</Link>
        <Link href="/shop" className="btn-outline">Browse the Shop</Link>
      </div>
    </div>
  );
}
