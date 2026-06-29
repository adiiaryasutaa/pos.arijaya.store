# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

1. **No hallucinating** — never guess, invent, or assume details about the codebase, APIs, or behavior. Read the actual files first.
2. **Ask before assuming** — if anything is unclear, ask. Prefer asking many specific questions over producing a hallucinated response.
3. **Best practices always** — follow language, framework, and security best practices at all times.
4. **Prefer commands over generation** — if an action can be done by executing a command, run it instead of generating the output manually.

## Commands

```bash
pnpm dev              # start dev server at localhost:3000 (sets TMPDIR=/tmp for Node v24+)
pnpm build            # production build
pnpm preview          # preview production build
pnpm generate         # static prerender
```

Database schema and type generation go through the **Supabase MCP server** (apply migrations, regenerate types), not the Supabase CLI.

No test runner, linter, or formatter is configured (no prettier/eslint). The only code check is TypeScript: `npx tsc --noEmit`.

## Architecture

**Nuxt 4** with the `app/` directory convention. All source lives under `app/` — pages, components, composables, middleware, plugins, types.

**Supabase** handles auth, Postgres, and realtime. The client is injected via `@nuxtjs/supabase` and accessed with `useSupabaseClient<Database>()` and `useSupabaseUser()`. Auth middleware (`app/middleware/auth.ts`) uses the reactive `useSupabaseUser()` — no network round-trip on navigation. `app/middleware/admin.ts` gates admin-only pages.

**State**: Pinia (`@pinia/nuxt`) holds global state in `app/stores/` — `useCartStore` (cart) and `useSettingsStore` (store name + per-user font size). Both are setup-style stores; destructure reactive state/getters via `storeToRefs(store)` and actions directly off the store. `storeToRefs`/`defineStore`/store hooks are auto-imported.

**Composables** (`app/composables/`) are stateless data-access/utilities: `useProducts` (server-side lazy pagination + filters), `useCurrency` (IDR formatting), `useTransactions` (history + search), `useUsers`.

**Admin user CRUD** runs through Nitro server routes in `server/api/users/` (not direct client DB access) — these use the Supabase service role and are guarded by `server/utils/requireAdmin.ts`. Never expose user management via the client SDK.

**Settings**: `store_config` (admin-set store name, single row) and `user_preferences` (per-user font size) tables, wired through `useSettingsStore`. It derives the user id from `useSupabaseUser()` JWT `sub` (a computed ref, optional-chained) — passing a raw `user.value.id` can yield the string `"undefined"` and trip RLS (403). `app/app.vue` loads settings client-side via `useLazyAsyncData('settings', () => settings.loadSettings(), { server: false })` to avoid SSR cold-start retry warnings; `login.vue` triggers `refreshNuxtData('settings')` after sign-in.

**Critical security constraint**: `transactions` and `transaction_items` have no client INSERT policies. All sales go through the `create_transaction(p_payment_method, p_items, p_amount_paid)` SECURITY DEFINER RPC, which recomputes totals server-side, derives `user_id` from `auth.uid()`, and atomically decrements stock. Never add direct client INSERT paths for these tables.

**Cart state**: `useCartStore` (Pinia) holds the cart. localStorage persistence is handled by `pinia-plugin-persistedstate` (`persist: { key: 'pos-cart', pick: ['items'] }`) — no manual plugin. Always call `cart.syncWithProducts(products)` after fetching products to reconcile a restored cart against current stock and prices.

**DB types**: `app/types/database.types.ts` is generated — never edit by hand. After schema changes, regenerate via the Supabase MCP server. Migrations live in `supabase/migrations/` and are additive — never edit an applied migration.

## UI Conventions

- **Elder-friendly UX**: minimum tap targets `h-11`/`h-12`/`h-14`, text `text-lg`/`text-xl`. Keep touch targets large.
- **Indonesian copy** throughout — product/UI labels, error toasts, and all user-facing strings are in Bahasa Indonesia.
- All numeric inputs use `type="text" inputmode="numeric" pattern="[0-9]*"` — never `type="number"`.
- Icons: mixed `@phosphor-icons/vue` and `@tabler/icons-vue` (theme preset `reka-lyra` uses tabler). Inline icons use `data-icon="inline-start"` attribute.
- shadcn-vue components are in `app/components/ui/`. Tailwind CSS v4. **Gotcha**: shadcn-vue scaffolds components with `@lucide/vue` imports, which is NOT installed. After adding any shadcn component, swap lucide imports to tabler (`XIcon`→`IconX`, `ChevronDownIcon`→`IconChevronDown`, `CheckIcon`→`IconCheck`, `Loader2Icon`→`IconLoader2`, etc.) or the build fails with "Cannot find package '@lucide/vue'".

## Cashier Page Layout

`/cashier` uses a viewport-locked layout (`h-screen overflow-hidden` on the root div) so the desktop cart sidebar stays fixed without scrolling. The product grid scrolls via `<ScrollArea>`. The cart sidebar requires `overflow-hidden` so its inner `<ScrollArea flex-1>` gets a bounded height. Mobile uses a fixed bottom bar + Sheet drawer.
