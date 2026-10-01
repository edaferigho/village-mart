-- ============================================================================
-- Village Mart — ALL-IN-ONE database setup
--
-- HOW TO USE:
--   1. Open this FILE in your code editor and copy its ENTIRE contents
--      (this comment block included — it is valid SQL).
--   2. Supabase Dashboard → SQL Editor → New query.
--   3. Paste everything and click Run.
--   4. Refresh the Village Mart website.
--
-- This single file creates all tables + row-level-security policies AND
-- loads the 7 categories / 23 demo products. It is safe to run more than
-- once (tables use IF NOT EXISTS, policies use DROP IF EXISTS, inserts
-- use ON CONFLICT DO NOTHING).
-- ============================================================================

-- ============================================================================
-- ============================================================================
-- Village Mart — Supabase schema
-- Run this file first in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Then run supabase/seed.sql to load the demo catalog.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Categories (e.g. "Rice & Grains", "Cooking Oil & Fats")
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- URL-safe identifier, e.g. 'rice-grains'
  name        text not null,
  tagline     text,                            -- short marketing line
  image_url   text,                            -- tile image path
  sort_order  integer not null default 0,      -- display ordering
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Products (pricepally-style packaged foodstuff, priced in whole Naira)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  brand             text,
  description       text,
  category_slug     text not null references public.categories(slug)
                      on update cascade on delete cascade,
  unit_label        text,                      -- e.g. '50kg bag', '400g × 6'
  price             integer not null check (price >= 0),            -- ₦
  compare_at_price  integer check (compare_at_price >= 0),          -- original ₦ when on SALE
  image_url         text,
  badge             text check (badge in ('NEW', 'BESTSELLER', 'SALE')),
  rating            numeric(2,1) check (rating between 0 and 5),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_slug);
create index if not exists products_sort_idx     on public.products (sort_order);

-- ---------------------------------------------------------------------------
-- 3. Customers — Google sign-in accounts
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  google_sub    text unique,                   -- Google's stable user id ('sub')
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 4. Orders + order items (checkout persistence)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                       uuid primary key default gen_random_uuid(),
  order_number             text not null unique,          -- e.g. 'VM-K3F9Q2'
  customer_id              uuid references public.customers(id) on delete set null,
  -- Contact + delivery snapshot (kept even for guest checkouts)
  customer_name            text not null,
  customer_email           text not null,
  customer_phone           text not null,
  delivery_address         text not null,
  city                     text not null,
  state                    text not null,
  note                     text,
  payment_method           text not null check (payment_method in ('pay_on_delivery', 'bank_transfer')),
  status                   text not null default 'pending'
                             check (status in ('pending', 'confirmed', 'delivered', 'cancelled')),
  -- Money totals in whole Naira (recomputed server-side, never trusted from client)
  subtotal                 integer not null check (subtotal >= 0),
  delivery_fee             integer not null default 0 check (delivery_fee >= 0),
  total                    integer not null check (total >= 0),
  -- Set to true when the Mailgun confirmation email was accepted
  confirmation_email_sent  boolean not null default false,
  created_at               timestamptz not null default now()
);

create index if not exists orders_created_idx  on public.orders (created_at desc);
create index if not exists orders_customer_idx on public.orders (customer_id);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  -- Snapshot of the product at purchase time (prices/brands can change later)
  product_name text not null,
  unit_label   text,
  unit_price   integer not null check (unit_price >= 0),
  quantity     integer not null check (quantity > 0),
  line_total   integer not null check (line_total >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- 5. Newsletter subscribers (footer signup form)
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- The storefront uses the publishable (anon) key, so RLS policies decide what
-- it may read/write. This is a DEMO storefront: reads are public, and order /
-- subscriber creation is open because guests must be able to check out.
--
-- In production you would scope order SELECT/INSERT to the authenticated
-- owner (e.g. via Supabase Auth + auth.uid()) and lock everything else down.
-- ============================================================================

alter table public.categories              enable row level security;
alter table public.products                enable row level security;
alter table public.customers               enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.newsletter_subscribers  enable row level security;

-- Public catalog: anyone can browse.
-- (drop-if-exists keeps this file safe to re-run)
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories
  for select using (true);

drop policy if exists "Public read products" on public.products;
create policy "Public read products" on public.products
  for select using (true);

-- Customers: rows are created/read by the OAuth callback for the signing-in user.
drop policy if exists "Public upsert customers" on public.customers;
create policy "Public upsert customers" on public.customers
  for insert with check (true);

drop policy if exists "Public read customers" on public.customers;
create policy "Public read customers" on public.customers
  for select using (true);

-- Orders: guests must be able to place an order and later view its status page.
drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders" on public.orders
  for insert with check (true);

drop policy if exists "Public read orders" on public.orders;
create policy "Public read orders" on public.orders
  for select using (true);

drop policy if exists "Public update email flag" on public.orders;
create policy "Public update email flag" on public.orders
  for update using (true) with check (true);

drop policy if exists "Public insert order items" on public.order_items;
create policy "Public insert order items" on public.order_items
  for insert with check (true);

drop policy if exists "Public read order items" on public.order_items;
create policy "Public read order items" on public.order_items
  for select using (true);

-- Newsletter: anyone may subscribe.
drop policy if exists "Public insert subscribers" on public.newsletter_subscribers;
create policy "Public insert subscribers" on public.newsletter_subscribers
  for insert with check (true);


-- ============================================================================
-- Village Mart — demo catalog seed
-- Run AFTER supabase/schema.sql (Supabase Dashboard → SQL Editor).
-- Prices are whole Naira, in the style of pricepally.com.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, tagline, image_url, sort_order) values
  ('rice-grains',      'Rice & Grains',        'Bags of rice, beans & swallow staples', '/images/cat-rice-grains.jpg',      1),
  ('oils-fats',        'Cooking Oil & Fats',   'Groundnut, palm oil & more',            '/images/cat-oils-fats.jpg',        2),
  ('tomato-canned',    'Tomato Paste & Canned','Tinned tomatoes, sardines & mixes',     '/images/cat-tomato-canned.jpg',    3),
  ('pasta-noodles',    'Pasta & Noodles',      'Spaghetti, macaroni & instant noodles', '/images/cat-pasta-noodles.jpg',    4),
  ('beverages-dairy',  'Beverages & Dairy',    'Milo, milk, coffee & family tins',      '/images/cat-beverages-dairy.jpg',  5),
  ('spices-pantry',    'Spices & Pantry',      'Seasoning cubes, sugar & honey',        '/images/cat-spices-pantry.jpg',    6),
  ('fresh-frozen',     'Fresh & Frozen',       'Eggs, frozen chicken & farm produce',   '/images/cat-fresh-frozen.jpg',     7)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
insert into public.products
  (slug, name, brand, description, category_slug, unit_label, price, compare_at_price, image_url, badge, rating, sort_order)
values
  -- Rice & Grains ------------------------------------------------------------
  ('royal-stallion-parboiled-rice-50kg', 'Royal Stallion Parboiled Rice', 'Royal Stallion',
   'Premium long-grain parboiled rice — stone-free, well-milled and perfect for jollof, fried rice and everyday family meals. Sold in the popular 50kg wholesale bag.',
   'rice-grains', '50kg bag', 98500, 110000, '/images/products/royal-stallion-parboiled-rice-50kg.jpg', 'BESTSELLER', 4.8, 1),

  ('mama-gold-parboiled-rice-25kg', 'Mama Gold Parboiled Rice', 'Mama Gold',
   'Trusted household favourite — clean, aromatic parboiled rice in a family-size 25kg bag. Great value for weekly cooking.',
   'rice-grains', '25kg bag', 52000, null, '/images/products/mama-gold-parboiled-rice-25kg.jpg', null, 4.6, 2),

  ('caprice-perfumed-rice-10kg', 'Caprice Gold Perfumed Rice', 'Caprice',
   'Imported perfumed rice with a naturally sweet aroma and fluffy, non-sticky grains when cooked.',
   'rice-grains', '10kg bag', 24500, null, '/images/products/caprice-perfumed-rice-10kg.jpg', 'NEW', 4.5, 3),

  ('honeywell-honey-beans-2kg', 'Honeywell Honey Beans (Oloyin)', 'Honeywell',
   'Specially selected brown honey beans (oloyin) — naturally sweet, cooks fast and ideal for ewa agonyin and beans porridge.',
   'rice-grains', '2kg', 8900, null, '/images/products/honeywell-honey-beans-2kg.jpg', null, 4.4, 4),

  ('ijebu-garri-white-5kg', 'Ijebu Garri (White)', 'Village Mart Select',
   'Sour, finely-grained Ijebu garri that soaks beautifully — perfect for garri soakings and eba.',
   'rice-grains', '5kg', 6500, null, '/images/products/ijebu-garri-white-5kg.jpg', null, 4.3, 5),

  ('golden-penny-semovita-10kg', 'Golden Penny Semovita', 'Golden Penny',
   'Fortified semolina flour for smooth, lump-free swallow. A family-size 10kg bag that lasts.',
   'rice-grains', '10kg', 15800, null, '/images/products/golden-penny-semovita-10kg.jpg', null, 4.5, 6),

  -- Cooking Oil & Fats -------------------------------------------------------
  ('kings-vegetable-oil-5l', 'Kings Vegetable Oil', 'Kings',
   'Cholesterol-free refined vegetable oil for frying and cooking — light taste, high smoke point.',
   'oils-fats', '5L jerrycan', 18500, 21000, '/images/products/kings-vegetable-oil-5l.jpg', 'SALE', 4.6, 7),

  ('power-oil-vegetable-oil-2-8l', 'Power Oil Vegetable Oil', 'Power Oil',
   'Heart-friendly cooking oil made from refined palm olein. One of Nigeria''s best-selling kitchen oils.',
   'oils-fats', '2.8L', 10500, null, '/images/products/power-oil-vegetable-oil-2-8l.jpg', null, 4.5, 8),

  ('mamador-palm-oil-5l', 'Mamador Premium Palm Oil', 'Mamador',
   'Filter-red, cholesterol-free palm oil with rich colour and taste — ideal for banga, efo riro and stew.',
   'oils-fats', '5L', 19800, null, '/images/products/mamador-palm-oil-5l.jpg', 'BESTSELLER', 4.7, 9),

  ('golden-penny-margarine-500g', 'Golden Penny Margarine', 'Golden Penny',
   'Creamy baking margarine for cakes, pastries and bread spread.',
   'oils-fats', '500g', 3200, null, '/images/products/golden-penny-margarine-500g.jpg', null, 4.2, 10),

  -- Tomato Paste & Canned ----------------------------------------------------
  ('gino-tomato-paste-6x400g', 'Gino Tomato Paste', 'Gino',
   'Nigeria''s No.1 tomato mix — double-concentrated tinned tomatoes with no added colour. Pack of six 400g tins.',
   'tomato-canned', '400g × 6', 4800, 5400, '/images/products/gino-tomato-paste-6x400g.jpg', 'SALE', 4.7, 11),

  ('derica-tomato-paste-12x210g', 'Derica Tomato Paste', 'Derica',
   'Rich, smooth tomato paste in value-pack cartons — the stew starter every Nigerian kitchen trusts.',
   'tomato-canned', '210g × 12', 7900, null, '/images/products/derica-tomato-paste-12x210g.jpg', null, 4.5, 12),

  ('titus-sardines-10x125g', 'Titus Sardines in Vegetable Oil', 'Titus',
   'Classic Portuguese-style sardines — protein-rich and ready to eat. Family pack of ten 125g tins.',
   'tomato-canned', '125g × 10', 8500, null, '/images/products/titus-sardines-10x125g.jpg', null, 4.4, 13),

  -- Pasta & Noodles ----------------------------------------------------------
  ('indomie-instant-noodles-24x120g', 'Indomie Instant Noodles (Super Pack)', 'Indomie',
   'The famous indomie super pack with pepper and chicken flavour — ready in 3 minutes. Carton of 24.',
   'pasta-noodles', '120g × 24', 9800, null, '/images/products/indomie-instant-noodles-24x120g.jpg', 'BESTSELLER', 4.8, 14),

  ('golden-penny-spaghetti-10x500g', 'Golden Penny Spaghetti', 'Golden Penny',
   'Firm, non-sticky spaghetti made from durum wheat. Bundle of ten 500g packs.',
   'pasta-noodles', '500g × 10', 8200, null, '/images/products/golden-penny-spaghetti-10x500g.jpg', null, 4.5, 15),

  -- Beverages & Dairy --------------------------------------------------------
  ('milo-activ-go-1-8kg', 'Milo Activ-Go', 'Nestlé',
   'Malt chocolate drink fortified with Activ-Go vitamins and minerals — the family-sized 1.8kg tin.',
   'beverages-dairy', '1.8kg tin', 12400, 13900, '/images/products/milo-activ-go-1-8kg.jpg', 'SALE', 4.7, 16),

  ('nescafe-classic-200g', 'Nescafé Classic Coffee', 'Nestlé',
   '100% pure instant coffee with the rich, full aroma Nescafé is known for. 200g jar.',
   'beverages-dairy', '200g jar', 6900, null, '/images/products/nescafe-classic-200g.jpg', null, 4.5, 17),

  ('peak-milk-powder-900g', 'Peak Full Cream Milk Powder', 'Peak',
   'Rich, creamy full-cream milk powder in a refill pack — 30 cups of fortified goodness.',
   'beverages-dairy', '900g refill', 14900, null, '/images/products/peak-milk-powder-900g.jpg', 'NEW', 4.6, 18),

  -- Spices & Pantry ----------------------------------------------------------
  ('dangote-granulated-sugar-10kg', 'Dangote Granulated Sugar', 'Dangote',
   'Fine, free-flowing white granulated sugar — bulk 10kg bag for home and business.',
   'spices-pantry', '10kg bag', 16500, null, '/images/products/dangote-granulated-sugar-10kg.jpg', null, 4.4, 19),

  ('maggi-chicken-cubes-100x10g', 'Maggi Chicken Seasoning Cubes', 'Maggi',
   'The classic taste-maker — chicken-flavoured seasoning cubes with iodine and iron. Jumbo pack of 100.',
   'spices-pantry', '10g × 100', 5600, null, '/images/products/maggi-chicken-cubes-100x10g.jpg', null, 4.8, 20),

  ('pure-honey-1l', 'Natural Ijebu Honey', 'Village Mart Select',
   'Raw, unadulterated honey harvested from Ogun State farms — thick, aromatic and 100% natural.',
   'spices-pantry', '1L bottle', 12500, null, '/images/products/pure-honey-1l.jpg', 'NEW', 4.9, 21),

  -- Fresh & Frozen -----------------------------------------------------------
  ('village-mart-frozen-chicken-1kg', 'Frozen Chicken (Cut-up)', 'Village Mart Fresh',
   'Cleanly dressed, IQF-frozen chicken cut into 8 pieces — hygienically processed and cold-chain delivered.',
   'fresh-frozen', '1kg pack', 7500, null, '/images/products/village-mart-frozen-chicken-1kg.jpg', 'NEW', 4.3, 22),

  ('crate-of-eggs-30pcs', 'Crate of Eggs', 'Village Mart Fresh',
   'Farm-fresh big brown eggs, hand-crated and same-day delivered. 30 pieces per crate.',
   'fresh-frozen', '30 pieces', 6800, null, '/images/products/crate-of-eggs-30pcs.jpg', 'BESTSELLER', 4.7, 23)
on conflict (slug) do nothing;


-- Run this in Supabase Dashboard → SQL Editor (paste the file's CONTENTS).
-- Adds: customer admin flag, promo codes, order discount columns.
-- Safe to re-run (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Admin flag on customers.
--    Promote yourself after signing in with Google:
--      update customers set is_admin = true where email = 'you@example.com';
--    (Alternatively set the ADMIN_EMAILS env var in Vercel — both work.)
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Promo codes ("run promos").
--    type  : 'percent' (value = % off) or 'fixed' (value = ₦ off)
--    scope : 'all' | 'category' (scope_value = category slug) | 'product' (scope_value = product id)
-- ---------------------------------------------------------------------------
create table if not exists public.promos (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                    -- e.g. 'JOLLOF10'
  type        text not null check (type in ('percent', 'fixed')),
  value       integer not null check (value > 0),
  scope       text not null default 'all' check (scope in ('all', 'category', 'product')),
  scope_value text,                                    -- category slug or product id when scoped
  starts_at   timestamptz,                             -- optional start of validity window
  ends_at     timestamptz,                             -- optional end of validity window
  is_active   boolean not null default true,
  usage_count integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists promos_code_idx on public.promos (code);

-- Checkout needs to read promos; writes go through the admin-checked API.
drop policy if exists "Public read promos" on public.promos;
create policy "Public read promos" on public.promos
  for select using (true);
drop policy if exists "Admin write promos" on public.promos;
create policy "Admin write promos" on public.promos
  for insert with check (true);
drop policy if exists "Admin update promos" on public.promos;
create policy "Admin update promos" on public.promos
  for update using (true) with check (true);
drop policy if exists "Admin delete promos" on public.promos;
create policy "Admin delete promos" on public.promos
  for delete using (true);

-- ---------------------------------------------------------------------------
-- 3. Discount columns on orders (applied promo at purchase time).
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists promo_code text,
  add column if not exists discount_amount integer not null default 0;

-- ---------------------------------------------------------------------------
-- 4. Product image uploads — Supabase Storage.
--    Creates a PUBLIC bucket ("product-images") that the admin forms upload
--    to; uploaded files are served from
--    /storage/v1/object/public/product-images/<path>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read so storefront <img> tags can load uploaded images directly.
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

-- Uploads happen from the admin server actions (app-gated; see note below).
drop policy if exists "Public upload product images" on storage.objects;
create policy "Public upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images');

drop policy if exists "Public update product images" on storage.objects;
create policy "Public update product images" on storage.objects
  for update using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

-- ---------------------------------------------------------------------------
-- NOTE ON SECURITY (demo scope)
-- The storefront talks to Supabase with the publishable key, so table-level
-- RLS cannot distinguish "admin" from "customer" — every admin mutation is
-- instead gated in the app layer (src/lib/admin.ts + server actions check
-- the signed session and the is_admin flag / ADMIN_EMAILS env before any
-- write). For a hardened production setup, move these writes behind
-- Supabase Auth + service-role key or database functions with auth checks.
-- ---------------------------------------------------------------------------


-- Run in Supabase Dashboard → SQL Editor (paste the file's CONTENTS).
-- Safe to re-run (idempotent).
-- ============================================================================

-- Payment tracking on orders:
--   payment_reference : Paystack transaction reference (set when checkout
--                       initializes a payment for the order)
--   payment_status    : 'unpaid' | 'paid'
--                       ('unpaid' for Pay-on-Delivery orders too)
--   paid_at           : when the payment was confirmed via Paystack
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_at timestamptz;

create index if not exists orders_payment_ref_idx on public.orders (payment_reference);
