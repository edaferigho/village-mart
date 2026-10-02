# Village Mart 🧺

A modern online store for foodstuffs — rice, oils, tomato paste, pasta, beverages, spices and more — inspired by [pricepally.com](https://www.pricepally.com/) and styled after the moodboard in `moodboard/`.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**, persisting everything in **Supabase**, sending order confirmations through **Mailgun**, and signing customers in with **Google OAuth (Google Cloud Console)**.

---

## Features

| Area | What it does |
| --- | --- |
| Storefront | Auto-rotating hero, trust strip, category tiles, Top Picks, bulk-deals banner, New Arrivals / Best Sellers, newsletter — mirroring the moodboard layout |
| Shop | Category chips, search (`?q=`), badge filters (New/Best Sellers), price & name sorting |
| Product page | Gallery, ratings, quantity picker, related products |
| Cart | Persistent (localStorage), quantity steppers, free-delivery threshold (₦50,000) |
| Checkout | Contact + Nigerian-state delivery form, Pay-on-Delivery / Bank Transfer, sticky order summary, **server-side price recomputation** |
| Orders | Persisted in Supabase (`orders` + `order_items`), confirmation page at `/order/<id>`, order history at `/account` |
| Auth | "Sign in with Google" (Authorization Code flow), signed session cookie (JWT), customer rows upserted into Supabase |
| Email | Branded HTML order confirmation sent via the Mailgun API |
| Extras | Newsletter signup persisted in Supabase, graceful "database not set up" banners, 404 page |

## Quick start

### 1. Install & run

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` is already filled in from the files in `API keys/`. For a fresh install, copy `.env.example` to `.env.local` and fill in your own values.

### 2. Create the database tables (one time)

The Supabase project starts empty. In your **Supabase Dashboard → SQL Editor**, paste the **contents** of one file and click Run:

- Easiest: `supabase/setup.sql` — everything in one paste (tables + policies + 7 categories + 23 demo products).
- Or in two steps: `supabase/schema.sql` first, then `supabase/seed.sql`.

All three files are safe to re-run (idempotent). > Copy the SQL code from inside the file — not the file name.

Until this is done, the storefront shows a friendly "Database setup required" banner instead of crashing.

> **Optional — preview the full UI before wiring Supabase:** a local PostgREST-compatible mock ships with the repo.
>
> ```bash
> node scripts/mock-supabase.mjs &                                  # terminal 1 (REST mock on :54321)
> NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 npm run dev      # terminal 2
> ```
>
> This is for UI demos only — orders placed against the mock are not persisted to Supabase.

### 3. Enable Google sign-in

The OAuth client credentials (from `API keys/google auth keys.json`) are wired into `.env.local`. Google only redirects to URIs registered on the client, so in **Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client** add:

```
http://localhost:3000/api/auth/google/callback
```

(For production, also add your deployed origin, e.g. `https://yourdomain.com/api/auth/google/callback`, or set `GOOGLE_REDIRECT_URI`.)

### 4. Receive confirmation emails

Mailgun credentials (from `API keys/Mailgun keys.txt`) are wired into `.env.local`. **Sandbox domains only deliver to Authorized Recipients** — in the Mailgun dashboard go to *Sending → Authorized Recipients* and add the email address you test with. Every order is still saved in Supabase; the order page tells you whether the email went out.

---

## How the pieces fit together

```
Browser ──► Next.js pages (App Router)
              │           ▲
              │           └── session cookie (JWT, HS256, 7 days)
              ▼
        /api/orders ──► Supabase (orders, order_items, customers)
              │
              └────────► Mailgun API (confirmation email)
```

- **Catalog** is read directly from Supabase in server components (`src/lib/data.ts`).
- **Checkout** posts to `/api/orders`: the server validates with zod, **re-prices every line against the `products` table** (client prices are never trusted), computes totals, inserts the order + snapshot line items, then fires the Mailgun email. Email failure never blocks an order — it's recorded in `orders.confirmation_email_sent`.
- **Google auth** is a hand-rolled OAuth 2.0 Authorization Code flow (`src/app/api/auth/google/...`): state-based CSRF protection, token exchange, profile fetch via the UserInfo endpoint, customer upsert in Supabase, signed `vm_session` cookie (`src/lib/auth.ts`).
- **Cart** is client-side (`src/context/CartContext.tsx`, localStorage) — products, orders, customers and subscribers are what persist in the database.

## Project structure

```
├── API keys/                  # provided credentials (source for .env.local)
├── moodboard/                 # design reference
├── public/images/             # downloaded product/hero/category photos
├── supabase/
│   ├── schema.sql             # tables + indexes + RLS policies
│   └── seed.sql               # demo catalog (7 categories, 23 products)
├── scripts/download-images.mjs# image fetch helper (Unsplash + Wikimedia)
└── src/
    ├── app/
    │   ├── page.tsx           # home (moodboard layout)
    │   ├── shop/              # catalog + filters
    │   ├── product/[slug]/    # product detail
    │   ├── cart/              # cart
    │   ├── checkout/          # checkout page
    │   ├── order/[id]/        # order confirmation
    │   ├── login/             # Google sign-in
    │   ├── account/           # profile + order history
    │   └── api/               # auth/google, auth/me, auth/signout, orders, newsletter
    ├── components/            # Header, Footer, Hero, ProductCard, …
    ├── context/CartContext.tsx
    └── lib/                   # supabase, auth, mailgun, data, format, types
```

## Security notes (demo scope)

- RLS policies in `schema.sql` are intentionally permissive: the storefront uses the publishable key and supports **guest checkout**, so anyone may read products and create orders. For production, scope order reads/writes to the owning user (Supabase Auth `auth.uid()`) and keep a service-role key server-side.
- Prices always come from the database, never the client payload.
- Session cookies are `httpOnly`, `SameSite=Lax` and `Secure` in production.

## Admin dashboard

Visit `/admin` (an **Admin** link appears in the header for admins). Features:

- **Dashboard** — revenue / orders / units sold / active promos KPIs, **best-sellers** ranking (units + revenue bars) and the recent-orders feed.
- **Products** — add, edit and delete products: name, brand, category, pack size, **selling price**, **original price** (creates the strikethrough discount + SALE treatment on the storefront), badge, rating, image URL (with live preview) and display order.
- **Categories** — add, edit and delete shop categories (deleting removes its products; slugs cascade to products).
- **Promos** — create discount codes (`% off` or flat `₦ off`) scoped to everything / a category / a product, with optional start & end dates, plus pause / resume / delete. Shoppers apply codes at checkout; the discount is re-validated server-side at order time and stored on the order.

### Becoming an admin

Admin access requires a Google sign-in plus one of:

1. **SQL promote** — after signing in once, run in Supabase SQL Editor:
   ```sql
   update customers set is_admin = true where email = 'you@example.com';
   ```
2. **Environment allow-list** — add `ADMIN_EMAILS=you@example.com,other@x.com` in Vercel → Settings → Environment Variables and redeploy.

Every admin mutation is gated server-side (`src/lib/admin.ts` + `src/app/admin/actions.ts`); the database alone cannot enforce admin rights because the storefront writes with the publishable key (demo-grade RLS — see notes above).

### Applying this feature to an existing database

If you created the tables before the admin feature existed, run `supabase/migration-admin.sql` in the Supabase SQL editor (adds the `customers.is_admin` flag, the `promos` table and the order discount columns). Fresh installs get everything from `supabase/setup.sql`.

## Mobile app (`mobile/`)

A **React Native (Expo)** Android app that talks to the **same deployed backend API** as the website:

- **One account everywhere** — sign-in is by *device pairing*: on the website go to **My Orders → "Connect the mobile app"** to get a 6-digit code, enter it in the app's Account tab, and the backend issues the same session token (same orders, same cart). Guests can shop first and pair later; their cart merges into the account automatically.
- **One cart everywhere** — carts live server-side (`cart_items` in Supabase, owner-keyed). The website and the app both write through to `/api/cart`; incoming changes arrive via **Supabase Realtime** (instant) with a poll + focus-refresh fallback, so adding an item on the website shows it in the app within seconds — no refresh needed.
- Screens: Shop (catalog, search, categories, pull-to-refresh), Cart (live sync badge, quantity steppers, checkout with Pay on Delivery), Orders (history + paid status), Account (pairing, sign out).

### Build the APK

```bash
cd mobile
npm install
npx expo prebuild -p android        # generates android/
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Requires JDK 17 and an Android SDK (`ANDROID_HOME`). `mobile/android` already carries a release signing config (`app/keystore/village-mart-release.keystore`, password `villagemart2026`) — replace it with your own for production. The app's backend URL is set in `mobile/.env` (`EXPO_PUBLIC_API_URL`).

### Applying this feature to an existing database

Run `supabase/migration-mobile.sql` in the Supabase SQL editor — creates `cart_items` (+ realtime publication) and `pairing_codes`. Fresh installs get everything from `setup.sql`.

## Payments (Paystack)

Checkout offers three ways to pay: **Pay Online** (Paystack popup), **Pay on Delivery**, and manual **Bank Transfer**.

- Choosing *Pay Online* saves the order, then opens the **Paystack popup** (inline.js v2) where the customer picks **Card**, **Bank Transfer**, USSD, etc.
- Amounts are initialized **server-side** from the saved order (the client never sets prices), in kobo, with a unique per-attempt reference stored on the order (`orders.payment_reference`).
- On success the order page re-verifies the transaction with Paystack (`/api/payments/verify`), marks the order **paid + confirmed** (`payment_status`, `paid_at`), and shows a paid banner. Unpaid Paystack orders get a **Complete Payment** button that reopens the popup anytime.
- In Paystack **test mode**, complete the popup with the test helper (choose *Success*) or card `4084 0840 8408 4081`, any future expiry, CVV `408`, OTP `123456`.

Required env vars: `PAYSTACK_SECRET_KEY` (server) and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (browser). Existing databases need `supabase/migration-paystack.sql` (adds `payment_reference`, `payment_status`, `paid_at`); fresh installs get it via `setup.sql`.

## Scripts

```bash
npm run dev     # develop at http://localhost:3000
npm run build   # production build
npm start       # serve the production build
```
