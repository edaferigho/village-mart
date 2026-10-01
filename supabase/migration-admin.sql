-- ============================================================================
-- Village Mart — ADMIN DASHBOARD migration
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
-- NOTE ON SECURITY (demo scope)
-- The storefront talks to Supabase with the publishable key, so table-level
-- RLS cannot distinguish "admin" from "customer" — every admin mutation is
-- instead gated in the app layer (src/lib/admin.ts + server actions check
-- the signed session and the is_admin flag / ADMIN_EMAILS env before any
-- write). For a hardened production setup, move these writes behind
-- Supabase Auth + service-role key or database functions with auth checks.
-- ---------------------------------------------------------------------------
