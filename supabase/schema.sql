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
