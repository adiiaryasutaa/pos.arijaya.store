-- Tighten RLS: force all transaction writes through the create_transaction RPC.
--
-- create_transaction is SECURITY DEFINER and inserts the transaction + items itself,
-- so these direct client INSERT policies are unused — and worse, they let a client
-- forge a transaction with an arbitrary total/subtotal that bypasses server-side
-- recomputation. Dropping them makes the RPC the only write path.
drop policy if exists "Authenticated users can insert transactions"      on public.transactions;
drop policy if exists "Authenticated users can insert transaction_items" on public.transaction_items;

-- Redundant index: the `name text not null unique` constraint on products already
-- creates a unique btree index, so idx_products_name duplicates it.
drop index if exists public.idx_products_name;
