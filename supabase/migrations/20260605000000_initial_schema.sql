-- Products
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  price       numeric(15, 2) not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  category    text,
  unit        text not null default 'pcs',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Transactions
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  payment_method  text not null check (payment_method in ('cash', 'transfer')),
  total           numeric(15, 2) not null check (total >= 0),
  note            text,
  user_id         uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Transaction Items (price snapshot — survives product edits/deletes)
create table if not exists public.transaction_items (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,
  product_price   numeric(15, 2) not null,
  quantity        integer not null check (quantity > 0),
  subtotal        numeric(15, 2) not null
);

-- Auto-update updated_at on products
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

-- Indexes
create index if not exists idx_transaction_items_transaction_id
  on public.transaction_items(transaction_id);

create index if not exists idx_transactions_created_at
  on public.transactions(created_at desc);

create index if not exists idx_products_name
  on public.products(name);

-- Row Level Security
alter table public.products        enable row level security;
alter table public.transactions    enable row level security;
alter table public.transaction_items enable row level security;

-- Products: authenticated users can read/write
create policy "Authenticated users can read products"
  on public.products for select
  to authenticated using (true);

create policy "Authenticated users can insert products"
  on public.products for insert
  to authenticated with check (true);

create policy "Authenticated users can update products"
  on public.products for update
  to authenticated using (true) with check (true);

create policy "Authenticated users can delete products"
  on public.products for delete
  to authenticated using (true);

-- Transactions: authenticated users can read/write
create policy "Authenticated users can read transactions"
  on public.transactions for select
  to authenticated using (true);

create policy "Authenticated users can insert transactions"
  on public.transactions for insert
  to authenticated with check (true);

-- Transaction Items: authenticated users can read/write
create policy "Authenticated users can read transaction_items"
  on public.transaction_items for select
  to authenticated using (true);

create policy "Authenticated users can insert transaction_items"
  on public.transaction_items for insert
  to authenticated with check (true);
