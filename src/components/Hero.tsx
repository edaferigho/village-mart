"use client";

/**
 * Auto-rotating hero carousel (dark navy panel like the moodboard).
 * Three slides, 6 seconds each, with clickable dots.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

/** Slide copy + artwork. Images live in /public/images. */
const SLIDES = [
  {
    eyebrow: "FRESH FROM THE MARKET",
    title: "Fresh Foodstuff.",
    titleAccent: "Honest Prices.",
    subtitle: "Shop rice, oils, pasta and pantry staples at prices your pocket will love.",
    cta: "Start Shopping",
    image: "/images/hero-1.jpg",
  },
  {
    eyebrow: "WHOLESALE FRIENDLY",
    title: "Buy in Bulk.",
    titleAccent: "Save More.",
    subtitle: "Family-size bags and cartons at market prices — perfect for homes, caterers and shops.",
    cta: "Shop Bulk Deals",
    image: "/images/hero-2.jpg",
  },
  {
    eyebrow: "FAST DELIVERY",
    title: "Farm to Door",
    titleAccent: "in 48 Hours.",
    subtitle: "Order today, relax tomorrow. Careful packing and cold-chain delivery for fresh items.",
    cta: "Explore Categories",
    image: "/images/hero-3.jpg",
  },
];

export default function Hero() {
  const [active, setActive] = useState(0);

  // Auto-advance the carousel every 6 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[active];

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      {/* Soft blue glow behind the product shot, like the moodboard hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-brand-600/30 blur-3xl"
      />

      <div className="container-page relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
        {/* Copy column */}
        <div key={active} className="animate-fadeUp">
          <p className="text-xs font-bold tracking-[0.2em] text-brand-500">{slide.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-[56px]">
            {slide.title}
            <br />
            {slide.titleAccent}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">{slide.subtitle}</p>
          <div className="mt-8">
            <Link href="/shop" className="btn-primary px-7 py-3 text-base">
              {slide.cta}
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Carousel dots */}
          <div className="mt-10 flex gap-2" role="tablist" aria-label="Hero slides">
            {SLIDES.map((s, i) => (
              <button
                key={s.eyebrow}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all ${
                  i === active ? "w-7 bg-brand-500" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Image column */}
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 shadow-2xl lg:aspect-[5/4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image}
              alt="Fresh foodstuff at Village Mart"
              className="h-full w-full object-cover"
              loading="eager"
            />
            {/* Bottom fade so the photo blends into the navy panel */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
          </div>

          {/* Floating price chip for a little storefront personality */}
          <div className="absolute -bottom-5 left-6 rounded-xl bg-white px-4 py-3 text-navy shadow-lift">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Parboiled rice</p>
            <p className="text-lg font-extrabold">
              ₦98,500 <span className="text-xs font-medium text-slate-400 line-through">₦110,000</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
