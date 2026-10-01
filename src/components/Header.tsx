"use client";

/**
 * Store header, modelled on the moodboard:
 * logo · nav links · search · account · cart (with item-count badge).
 * Collapses into a hamburger menu on small screens.
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { NAV_LINKS } from "@/lib/constants";
import { useCart } from "@/context/CartContext";
import type { SessionUser } from "@/lib/types";

/** Brand logo: basket glyph in a rounded hexagon + wordmark. */
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Village Mart home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        {/* Shopping-basket icon */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M3 9h18l-1.5 10.5A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-1.5L3 9Z" strokeLinejoin="round" />
          <path d="M8 9 12 3l4 6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 13v4M12 13v4M15 13v4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-navy sm:text-xl">
        Village<span className="text-brand-600">Mart</span>
      </span>
    </Link>
  );
}

/** Inline SVG icons used in the icon row. */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M3 9h18l-1.5 10.5A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-1.5L3 9Z" strokeLinejoin="round" />
      <path d="M8 9 12 3l4 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Nav links — split into its own component so it can read the query string
 * (useSearchParams) inside a Suspense boundary, as Next.js requires.
 */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** A link is active when path AND query match (so "Shop" isn't lit up
   *  while the user is on "New Arrivals", which is also /shop?badge=NEW). */
  const isActive = (href: string) => {
    const [base, query = ""] = href.split("?");
    if (pathname !== base) return false;
    return query === searchParams.toString();
  };

  return (
    <>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          onClick={onNavigate}
          className={`relative rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(link.href) ? "text-brand-600" : "text-slate-600 hover:text-navy"
          }`}
        >
          {link.label}
          {/* Blue underline for the active item, like the moodboard */}
          {isActive(link.href) && (
            <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand-600" />
          )}
        </Link>
      ))}
    </>
  );
}

export default function Header({ user, isAdmin }: { user: SessionUser | null; isAdmin?: boolean }) {
  const { itemCount, isReady } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-6">
        <Logo />

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          <Suspense fallback={null}>
            <NavLinks />
          </Suspense>
          {/* Admin entry point — only rendered for admins */}
          {isAdmin && (
            <Link
              href="/admin"
              className="relative rounded-lg px-3 py-2 text-sm font-semibold text-navy transition hover:text-brand-600"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          {/* Search (desktop) — submits to the shop page as ?q= */}
          <form action="/shop" className="hidden md:block">
            <div className="relative">
              <input
                name="q"
                type="search"
                placeholder="Search rice, oil, pasta…"
                className="w-56 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-10 text-sm outline-none transition focus:w-64 focus:border-brand-600 focus:bg-white"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              {/* Explicit submit — search works with a click as well as Enter */}
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </form>

          {/* Account: avatar when signed in, user icon otherwise.
              Hidden on <sm screens — the hamburger menu carries the
              account link there, keeping the icon bar inside 320px. */}
          {user ? (
            <Link
              href="/account"
              className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-slate-100 sm:flex"
              title={user.name}
            >
              {user.picture ? (
                // Google profile photo
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 xl:block">
                {user.name.split(" ")[0]}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-navy sm:flex"
              title="Sign in"
            >
              <UserIcon />
            </Link>
          )}

          {/* Cart with live item-count badge */}
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-navy"
            title="Cart"
          >
            <CartIcon />
            {isReady && itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="container-page space-y-1 py-3">
            <form action="/shop" className="pb-2">
              <input
                name="q"
                type="search"
                placeholder="Search foodstuff…"
                className="input"
              />
            </form>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
            {/* Account entry for <sm screens, where the header icon is hidden */}
            <Link
              href={user ? "/account" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {user ? "My Account" : "Sign in"}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
