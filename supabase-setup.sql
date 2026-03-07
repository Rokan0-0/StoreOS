-- StoreOS Supabase Schema & RLS Migrations
-- Run these in order in the Supabase SQL Editor

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. businesses table
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text default 'Supermarket',
  address text,
  phone text,
  logo_url text,
  currency text default '₦',
  low_stock_threshold integer default 5,
  created_at timestamptz default now()
);

alter table businesses enable row level security;

create policy "Owner can manage their business"
  on businesses for all
  using (auth.uid() = owner_id);

-- 3. products table
create table products (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  category text,
  buy_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  quantity integer not null default 0,
  threshold integer default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table products enable row level security;

create policy "Business owner can manage products"
  on products for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

-- 4. customers table
create table customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

alter table customers enable row level security;

create policy "Business owner can manage customers"
  on customers for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

-- 5. sales table
create table sales (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete set null,
  items jsonb not null default '[]',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_type text not null check (payment_type in ('Cash', 'Transfer', 'Credit')),
  note text,
  created_at timestamptz default now()
);

alter table sales enable row level security;

create policy "Business owner can manage sales"
  on sales for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

-- 6. credit_transactions table
create table credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete cascade not null,
  sale_id uuid references sales(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null check (type in ('debit', 'repayment')),
  note text,
  created_at timestamptz default now()
);

alter table credit_transactions enable row level security;

create policy "Business owner can manage credit"
  on credit_transactions for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

-- 7. statements table
create table statements (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  type text not null check (type in ('daily', 'monthly')),
  period_start date not null,
  period_end date not null,
  total_revenue numeric(12,2) default 0,
  total_cash numeric(12,2) default 0,
  total_transfer numeric(12,2) default 0,
  total_credit_extended numeric(12,2) default 0,
  total_repayments numeric(12,2) default 0,
  data_json jsonb,
  created_at timestamptz default now()
);

alter table statements enable row level security;

create policy "Business owner can manage statements"
  on statements for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );

-- 8. Storage Buckets (For logos)
-- (Run this if you don't manually create the bucket in the UI)
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict do nothing;

create policy "Public access to logos"
  on storage.objects for select
  using ( bucket_id = 'logos' );

create policy "Authenticated users can upload logos"
  on storage.objects for insert
  with check ( bucket_id = 'logos' and auth.role() = 'authenticated' );

create policy "Users can update their own logos"
  on storage.objects for update
  using ( bucket_id = 'logos' and auth.role() = 'authenticated' );
