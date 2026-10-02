-- ============================================================================
-- Village Mart — MOBILE APP migration
-- Run in Supabase Dashboard → SQL Editor (paste the file's CONTENTS).
-- Adds: server-side shopping carts (synced web ↔ mobile) and device-pairing
-- codes so the mobile app can sign in with the SAME account as the website.
-- Safe to re-run (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Server-side cart lines.
--    owner_key is either 'user:<customers.id>' (signed in) or
--    'device:<random-id>' (guest device). The same account therefore sees
--    the same cart on the website and in the mobile app.
-- ---------------------------------------------------------------------------
create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  owner_key  text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  updated_at timestamptz not null default now()
);

-- One line per product per owner; upserts bump quantity instead of duplicating.
drop index if exists cart_items_owner_product_idx;
create unique index if not exists cart_items_owner_product_uq
  on public.cart_items (owner_key, product_id);
create index if not exists cart_items_owner_idx on public.cart_items (owner_key);

-- Demo-grade policies: the storefront/mobile app write with the publishable
-- key and scope every query to their own owner_key in the app layer
-- (see src/lib/cart-owner.ts). Harden with Supabase Auth for production.
drop policy if exists "Public read cart items" on public.cart_items;
create policy "Public read cart items" on public.cart_items
  for select using (true);
drop policy if exists "Public insert cart items" on public.cart_items;
create policy "Public insert cart items" on public.cart_items
  for insert with check (true);
drop policy if exists "Public update cart items" on public.cart_items;
create policy "Public update cart items" on public.cart_items
  for update using (true) with check (true);
drop policy if exists "Public delete cart items" on public.cart_items;
create policy "Public delete cart items" on public.cart_items
  for delete using (true);

-- ---------------------------------------------------------------------------
-- 2. Realtime: push cart changes to every signed-in device instantly.
--    (If the table is already in the publication this block is a no-op.)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.cart_items;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Pairing codes: the website shows a short-lived 6-digit code to a
--    signed-in customer; the mobile app exchanges it for a session token
--    bound to the SAME customer account.
-- ---------------------------------------------------------------------------
create table if not exists public.pairing_codes (
  code        text primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

drop index if exists pairing_codes_expiry_idx;
create index if not exists pairing_codes_expiry_idx on public.pairing_codes (expires_at);

drop policy if exists "Public read pairing codes" on public.pairing_codes;
create policy "Public read pairing codes" on public.pairing_codes
  for select using (true);
drop policy if exists "Public insert pairing codes" on public.pairing_codes;
create policy "Public insert pairing codes" on public.pairing_codes
  for insert with check (true);
drop policy if exists "Public delete pairing codes" on public.pairing_codes;
create policy "Public delete pairing codes" on public.pairing_codes
  for delete using (true);
