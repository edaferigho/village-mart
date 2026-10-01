/**
 * Trust strip under the hero (Free Delivery · Quality Guaranteed ·
 * Secure Payments · Support) — mirrors the moodboard's icon row.
 */
const FEATURES = [
  {
    title: "Free Delivery",
    subtitle: "On orders above ₦50,000",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" strokeLinejoin="round" />
        <circle cx="6.5" cy="18" r="1.8" />
        <circle cx="16.5" cy="18" r="1.8" />
      </svg>
    ),
  },
  {
    title: "Quality Guaranteed",
    subtitle: "Fresh & well-sealed products",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Secure Payments",
    subtitle: "Pay on delivery or transfer",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 14h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "24/7 Support",
    subtitle: "We're here to help",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
        <path d="M4 12a8 8 0 0 1 16 0" strokeLinecap="round" />
        <rect x="3" y="12" width="4" height="6" rx="1.5" />
        <rect x="17" y="12" width="4" height="6" rx="1.5" />
        <path d="M19 18a3 3 0 0 1-3 3h-2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function FeatureStrip() {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="container-page grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              {feature.icon}
            </span>
            <div>
              <p className="text-sm font-bold text-navy">{feature.title}</p>
              <p className="text-xs text-slate-500">{feature.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
