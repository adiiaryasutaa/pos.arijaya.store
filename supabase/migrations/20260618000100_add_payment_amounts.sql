-- Record cash tendered + change owed so the receipt can show "Bayar / Kembali".
-- Nullable: transfer payments (and pre-existing rows) leave these null.
alter table public.transactions
  add column if not exists amount_paid   numeric(15, 2) check (amount_paid >= 0),
  add column if not exists change_amount numeric(15, 2) check (change_amount >= 0);
