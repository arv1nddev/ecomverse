-- ============================================================
-- Ecomverse - Supabase schema
-- Run once: Supabase Dashboard > SQL Editor > New query > paste > Run
-- ============================================================

-- ---------- Enums ----------
create type public.order_status as enum
  ('new', 'ordered_from_supplier', 'shipped', 'delivered', 'cancelled');

create type public.payment_status as enum
  ('pending', 'paid', 'failed');

-- ---------- Helper: keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PROFILES (one per user; holds the single delivery address)
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text,
  phone        text,
  address_line text,
  city         text,
  state        text,
  pincode      text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint profiles_pincode_format check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  constraint profiles_phone_format   check (phone is null or phone ~ '^[6-9][0-9]{9}$')
);

-- Admin check used by every policy below.
-- SECURITY DEFINER so it can read profiles without triggering RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Auto-create a profile whenever someone signs up (Google or email).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Users may edit only address fields, never is_admin / email / id.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, address_line, city, state, pincode)
  on public.profiles to authenticated;

-- ============================================================
-- STORE SETTINGS (single row: shipping rule + delivery text)
-- ============================================================
create table public.store_settings (
  id                      int primary key default 1 check (id = 1),
  free_shipping_threshold numeric(10,2) not null default 500,
  shipping_fee            numeric(10,2) not null default 70,
  delivery_estimate       text not null default '9-10 days'
);

insert into public.store_settings default values;

alter table public.store_settings enable row level security;

create policy "settings_public_read"
  on public.store_settings for select to anon, authenticated
  using (true);

create policy "settings_admin_update"
  on public.store_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- CATALOG
-- ============================================================
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order int  not null default 0
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories (id) on delete set null,
  name              text not null,
  slug              text not null unique,
  short_description text,
  details           text[] not null default '{}',   -- key feature bullets
  variant_options   text[] not null default '{}',   -- e.g. {'S','M','L'}; empty = no variants
  price             numeric(10,2) not null check (price > 0),
  in_stock          boolean not null default true,
  is_active         boolean not null default true,  -- hide instead of deleting
  created_at        timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,                       -- path inside the product-images bucket
  sort_order   int  not null default 0              -- 0 = main image
);

create index product_images_product_idx on public.product_images (product_id);

-- Supplier link and cost live in their own table so they are NEVER
-- readable by customers (RLS cannot hide single columns).
create table public.product_supplier_info (
  product_id    uuid primary key references public.products (id) on delete cascade,
  supplier_url  text,
  supplier_cost numeric(10,2)
);

alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_supplier_info enable row level security;

create policy "categories_public_read"
  on public.categories for select to anon, authenticated using (true);
create policy "categories_admin_all"
  on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "products_public_read"
  on public.products for select to anon, authenticated using (is_active);
create policy "products_admin_all"
  on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "product_images_public_read"
  on public.product_images for select to anon, authenticated using (true);
create policy "product_images_admin_all"
  on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "supplier_info_admin_all"
  on public.product_supplier_info for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- ORDERS
-- Customers cannot insert/update orders directly. Orders are created
-- by the create-order Edge Function (service role), which sets all
-- prices on the server.
-- ============================================================
create sequence public.order_number_seq start 1001;

create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique
                        default ('ECV-' || nextval('public.order_number_seq')::text),
  user_id             uuid not null references public.profiles (id) on delete restrict,
  status              public.order_status  not null default 'new',
  payment_status      public.payment_status not null default 'pending',
  subtotal            numeric(10,2) not null check (subtotal >= 0),
  shipping_fee        numeric(10,2) not null check (shipping_fee >= 0),
  total               numeric(10,2) not null,
  -- delivery address copied at order time (later profile edits must not change it)
  ship_name           text not null,
  ship_phone          text not null,
  ship_address        text not null,
  ship_city           text not null,
  ship_state          text not null,
  ship_pincode        text not null,
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  tracking_number     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal + shipping_fee)
);

create index orders_user_idx    on public.orders (user_id);
create index orders_status_idx  on public.orders (status, payment_status);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete restrict,
  product_name text not null,                        -- snapshot at order time
  unit_price   numeric(10,2) not null check (unit_price > 0),
  quantity     int not null check (quantity > 0),
  variant      text,
  image_path   text
);

create index order_items_order_idx on public.order_items (order_id);

alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

create policy "orders_select_own_or_admin"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Admin can change status, tracking number, etc. Customers have no update policy.
create policy "orders_admin_update"
  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "order_items_select_own_or_admin"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_admin())
    )
  );

-- ============================================================
-- STORAGE: public bucket for product photos, admin-only writes
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_bucket_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_bucket_admin_write"
  on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ============================================================
-- AFTER RUNNING THIS FILE, make your client an admin:
-- 1) Dashboard > Authentication > Users > Add user (email + password)
-- 2) Run:  update public.profiles set is_admin = true where email = 'client@example.com';
-- ============================================================
