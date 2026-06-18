# Toko Arijaya — POS

Point-of-sale web app for **Toko Arijaya**, a small Indonesian grocery store. Built
mobile-first with oversized touch targets and Indonesian copy for **elderly, low-tech
cashiers**, and designed to run across **a few devices at once**.

## Features

- **Kasir** (`/cashier`) — product grid with search + category filter, cart, cash & change
  (`kembalian`) calculator, realtime stock sync across registers.
- **Inventaris** (`/inventory`) — CRUD products (mobile cards / desktop table).
- **Riwayat Transaksi** (`/transactions`) — paginated history with date presets
  (Hari ini / Minggu ini / Bulan ini / Semua) and accurate revenue summary.
- Email/password auth, printable/shareable receipts.

## Stack

Nuxt 4 · Vue 3 · TypeScript · Supabase (auth + Postgres) · Tailwind CSS v4 ·
shadcn-vue (Phosphor icons) · vue-sonner.

## Prerequisites

- Node.js (the dev script sets `TMPDIR=/tmp` to avoid an EINVAL socket error on Node v24).
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) — required by the local Supabase stack.

## Setup

```bash
pnpm install
cp .env.example .env   # then fill in SUPABASE_URL and SUPABASE_KEY
```

For local development, point `.env` at the local stack values printed by `pnpm db:status`
(API URL + anon key).

## Database (local Supabase)

```bash
pnpm db:start    # start the local stack (Docker)
pnpm db:reset    # apply all migrations + run seed.sql
pnpm db:seed     # re-run seed only (keeps existing data)
pnpm db:status   # show local URLs + keys
pnpm db:types    # regenerate app/types/database.types.ts from the live schema
pnpm db:push     # push migrations to the linked remote project
pnpm db:stop     # stop the local stack
```

Migrations live in `supabase/migrations/` and are **additive** — never edit an applied
migration; add a new one. After changing the schema, run `pnpm db:types` to keep the
generated types in sync.

### Schema overview

- `products` — name (unique), price, stock, category, unit.
- `transactions` — payment_method, total, amount_paid, change_amount, user_id.
- `transaction_items` — price snapshot per line (survives product edits/deletes).
- `create_transaction(p_payment_method, p_items, p_amount_paid)` — `SECURITY DEFINER` RPC:
  the **only** write path for sales. Recomputes totals/subtotals server-side, derives
  `user_id` from `auth.uid()`, and atomically decrements stock (rolls back on shortfall).

## Development

```bash
pnpm dev         # http://localhost:3000
```

## Production

```bash
pnpm build
pnpm preview
```

See the [Nuxt deployment docs](https://nuxt.com/docs/getting-started/deployment).
