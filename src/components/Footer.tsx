/**
 * Store footer — deep navy panel with link columns, matching the moodboard.
 */
import Link from "next/link";

/** Social icons row (decorative links). */
function SocialIcon({ label, path }: { label: string; path: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-brand-600 hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d={path} />
      </svg>
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M3 9h18l-1.5 10.5A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-1.5L3 9Z" strokeLinejoin="round" />
                <path d="M8 9 12 3l4 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-xl font-extrabold tracking-tight text-white">
              Village<span className="text-brand-500">Mart</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
            Your trusted online market for fresh foodstuff — rice, oils, pasta, spices and more,
            delivered from the market to your doorstep.
          </p>
          <div className="mt-5 flex gap-2">
            <SocialIcon
              label="Facebook"
              path="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.6-.1-1.4-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4V11H8v3h2.2v7h3.3Z"
            />
            <SocialIcon
              label="X (Twitter)"
              path="M17.7 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2 3h6.2l4.3 5.7L17.7 3Zm-1.1 16h1.7L7.4 4.7H5.6L16.6 19Z"
            />
            <SocialIcon
              label="Instagram"
              path="M12 7.4A4.6 4.6 0 1 0 16.6 12 4.6 4.6 0 0 0 12 7.4Zm0 7.6A3 3 0 1 1 15 12a3 3 0 0 1-3 3Zm5.9-7.8a1.1 1.1 0 1 1-1.1-1.1 1.1 1.1 0 0 1 1.1 1.1ZM12 4.6c2 0 2.3 0 3.1.1a4.2 4.2 0 0 1 1.5.3 3 3 0 0 1 1.7 1.7 4.2 4.2 0 0 1 .3 1.5c0 .8.1 1 .1 3.1s0 2.3-.1 3.1a4.2 4.2 0 0 1-.3 1.5 3 3 0 0 1-1.7 1.7 4.2 4.2 0 0 1-1.5.3c-.8 0-1 .1-3.1.1s-2.3 0-3.1-.1a4.2 4.2 0 0 1-1.5-.3 3 3 0 0 1-1.7-1.7 4.2 4.2 0 0 1-.3-1.5c0-.8-.1-1-.1-3.1s0-2.3.1-3.1a4.2 4.2 0 0 1 .3-1.5 3 3 0 0 1 1.7-1.7 4.2 4.2 0 0 1 1.5-.3c.8-.1 1-.1 3.1-.1Zm0-1.6c-2 0-2.3 0-3.2.1a5.8 5.8 0 0 0-1.9.4A4.6 4.6 0 0 0 4 6.9a5.8 5.8 0 0 0-.4 1.9C3.5 9.7 3.5 10 3.5 12s0 2.3.1 3.2a5.8 5.8 0 0 0 .4 1.9 4.6 4.6 0 0 0 2.9 2.9 5.8 5.8 0 0 0 1.9.4c.9.1 1.2.1 3.2.1s2.3 0 3.2-.1a5.8 5.8 0 0 0 1.9-.4 4.6 4.6 0 0 0 2.9-2.9 5.8 5.8 0 0 0 .4-1.9c.1-.9.1-1.2.1-3.2s0-2.3-.1-3.2a5.8 5.8 0 0 0-.4-1.9 4.6 4.6 0 0 0-2.9-2.9 5.8 5.8 0 0 0-1.9-.4C14.3 3 14 3 12 3Z"
            />
          </div>
        </div>

        {/* Shop links */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Shop</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="transition hover:text-white" href="/shop?category=rice-grains">Rice &amp; Grains</Link></li>
            <li><Link className="transition hover:text-white" href="/shop?category=oils-fats">Cooking Oil &amp; Fats</Link></li>
            <li><Link className="transition hover:text-white" href="/shop?category=tomato-canned">Tomato Paste &amp; Canned</Link></li>
            <li><Link className="transition hover:text-white" href="/shop?category=pasta-noodles">Pasta &amp; Noodles</Link></li>
            <li><Link className="transition hover:text-white" href="/shop?category=beverages-dairy">Beverages &amp; Dairy</Link></li>
            <li><Link className="transition hover:text-white" href="/shop">All Products</Link></li>
          </ul>
        </div>

        {/* Customer service links */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Customer Service</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="transition hover:text-white" href="/account">My Orders</Link></li>
            <li><Link className="transition hover:text-white" href="/cart">Shopping Cart</Link></li>
            <li><Link className="transition hover:text-white" href="/checkout">Checkout</Link></li>
            <li><Link className="transition hover:text-white" href="/login">Sign in with Google</Link></li>
            <li><a className="transition hover:text-white" href="#">Shipping &amp; Delivery</a></li>
            <li><a className="transition hover:text-white" href="#">Returns &amp; Refunds</a></li>
          </ul>
        </div>

        {/* Company + contact */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Company</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a className="transition hover:text-white" href="#">About Us</a></li>
            <li><a className="transition hover:text-white" href="#">Privacy Policy</a></li>
            <li><a className="transition hover:text-white" href="#">Terms of Service</a></li>
          </ul>
          <p className="mt-5 text-sm text-slate-400">
            12 Market Road, Surulere, Lagos
            <br />
            support@villagemart.ng · +234 800 000 0000
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Village Mart. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
