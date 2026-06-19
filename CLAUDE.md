# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

1. **No hallucinating** — never guess, invent, or assume details about the codebase, APIs, or behavior. Read the actual files first.
2. **Ask before assuming** — if anything is unclear, ask. Prefer asking many specific questions over producing a hallucinated response.
3. **Best practices always** — follow language, framework, and security best practices at all times.
4. **Prefer commands over generation** — if an action can be done by executing a command, run it instead of generating the output manually.
5. **Always format after editing** — run `pnpm format` after every file create or edit.

## Commands

```bash
pnpm dev              # start dev server at localhost:3000 (sets TMPDIR=/tmp for Node v24+)
pnpm build            # production build
pnpm preview          # preview production build

pnpm db:start         # start local Supabase stack (requires Docker)
pnpm db:reset         # apply all migrations + seed.sql
pnpm db:types         # regenerate app/types/database.types.ts from live schema
pnpm db:push          # push migrations to linked remote project
pnpm db:status        # show local URLs + anon key
```

No test runner is configured. TypeScript checking: `npx tsc --noEmit`.

## Architecture

**Nuxt 4** with the `app/` directory convention. All source lives under `app/` — pages, components, composables, middleware, plugins, types.

**Supabase** handles auth, Postgres, and realtime. The client is injected via `@nuxtjs/supabase` and accessed with `useSupabaseClient<Database>()` and `useSupabaseUser()`. Auth middleware (`app/middleware/auth.ts`) uses the reactive `useSupabaseUser()` — no network round-trip on navigation.

**Critical security constraint**: `transactions` and `transaction_items` have no client INSERT policies. All sales go through the `create_transaction(p_payment_method, p_items, p_amount_paid)` SECURITY DEFINER RPC, which recomputes totals server-side, derives `user_id` from `auth.uid()`, and atomically decrements stock. Never add direct client INSERT paths for these tables.

**Cart state**: `useCart()` uses Nuxt's `useState('cart')` for SSR-stable shared state. `app/plugins/cart-persistence.client.ts` hydrates from localStorage on `app:mounted` (after Vue hydration, to avoid SSR mismatch) and watches for changes. Always call `syncWithProducts(products)` after fetching products to reconcile a restored cart against current stock and prices.

**DB types**: `app/types/database.types.ts` is generated — never edit by hand. After schema changes, run `pnpm db:types`. Migrations live in `supabase/migrations/` and are additive — never edit an applied migration.

## UI Conventions

- **Elder-friendly UX**: minimum tap targets `h-11`/`h-12`/`h-14`, text `text-lg`/`text-xl`. Keep touch targets large.
- **Indonesian copy** throughout — product/UI labels, error toasts, and all user-facing strings are in Bahasa Indonesia.
- All numeric inputs use `type="text" inputmode="numeric" pattern="[0-9]*"` — never `type="number"`.
- Icons from `@phosphor-icons/vue`. Inline icons use `data-icon="inline-start"` attribute.
- shadcn-vue components are in `app/components/ui/`. Tailwind CSS v4.

## Cashier Page Layout

`/cashier` uses a viewport-locked layout (`h-screen overflow-hidden` on the root div) so the desktop cart sidebar stays fixed without scrolling. The product grid scrolls via `<ScrollArea>`. The cart sidebar requires `overflow-hidden` so its inner `<ScrollArea flex-1>` gets a bounded height. Mobile uses a fixed bottom bar + Sheet drawer.
