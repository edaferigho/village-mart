-- ============================================================================
-- Village Mart — PAYSTACK PAYMENTS migration
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

-- ---------------------------------------------------------------------------
-- IMPORTANT: widen the payment_method CHECK constraint to allow 'paystack'.
-- Tables created before Paystack support only allow 'pay_on_delivery' and
-- 'bank_transfer', which makes every Paystack checkout fail to save.
-- ---------------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('pay_on_delivery', 'bank_transfer', 'paystack'));
