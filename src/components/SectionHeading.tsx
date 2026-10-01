/**
 * Section heading with an optional "View All →" link on the right.
 */
import Link from "next/link";

export default function SectionHeading({
  title,
  href,
  linkLabel = "View All",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <h2 className="text-2xl font-extrabold text-navy sm:text-[28px]">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
        >
          {linkLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
