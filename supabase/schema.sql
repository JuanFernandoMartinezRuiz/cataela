create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  price numeric not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  main_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.raffles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prize text not null,
  description text,
  price_per_number numeric not null default 0,
  status text not null default 'draft',
  draw_date date,
  winner_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.raffle_numbers (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  number text not null,
  status text not null default 'available',
  buyer_name text,
  buyer_phone text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists raffle_numbers_unique_per_raffle
  on public.raffle_numbers (raffle_id, number);

insert into public.categories (name, slug)
values
  ('Velas en frasco', 'velas-en-frasco'),
  ('Velas florales', 'velas-florales')
on conflict (slug) do nothing;
