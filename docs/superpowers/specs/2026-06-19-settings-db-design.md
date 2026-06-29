# Settings — Database Persistence

**Date:** 2026-06-19
**Status:** Approved

## Problem

Settings (store name, font size) are currently stored only in localStorage. This means settings are lost on cache clear, don't sync across devices, and can't be audited. Store name appears on receipts and page titles — it must be authoritative.

## Decisions

| Setting | Scope | Rationale |
|---|---|---|
| Store name | Global (one row, all users) | Same name on all receipts |
| Font size | Per-user | Each cashier has their own display preference |
| Load strategy | DB only on page load | Always authoritative; localStorage removed |

## Schema

### `store_config`

```sql
CREATE TABLE store_config (
  id    int2 PRIMARY KEY DEFAULT 1,
  store_name  text NOT NULL DEFAULT 'Toko Arijaya',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_config_single_row CHECK (id = 1)
);

-- Seed the single row
INSERT INTO store_config (id) VALUES (1);

-- Trigger: keep updated_at fresh (reuses function from initial_schema migration)
CREATE TRIGGER store_config_updated_at
  BEFORE UPDATE ON store_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

RLS:
- `SELECT`: authenticated users
- `UPDATE`: authenticated users
- No INSERT, no DELETE (row is permanent)

### `user_preferences`

```sql
CREATE TABLE user_preferences (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  font_size  text NOT NULL DEFAULT 'sedang',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_font_size_check
    CHECK (font_size IN ('kecil', 'sedang', 'besar'))
);

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

RLS:
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`
- No DELETE


## Data Flow

### Load (SSR-safe, called once in `app.vue`)

```
app.vue <script setup>
  └── await loadSettings()
        ├── supabase.from('store_config').select('store_name').eq('id', 1).single()
        └── supabase.from('user_preferences').select('font_size').eq('user_id', uid).maybeSingle()
        → sets useState('settings') with merged result
```

`maybeSingle()` on user_preferences: if no row yet, use default `'sedang'`. Row is created on first font size save.

Login page is unauthenticated — `loadSettings()` skips the user_preferences fetch when no user is logged in, uses hardcoded defaults for SSR.

### Save

- **Store name** → `UPDATE store_config SET store_name = $1, updated_at = now() WHERE id = 1`
- **Font size** → `UPSERT user_preferences (user_id, font_size) ON CONFLICT (user_id) DO UPDATE SET font_size = $1, updated_at = now()`

Both called from `settings.vue` on form submit. Toast on success/error.

### Font class (client-side only)

`settings-persistence.client.ts` plugin is **removed**. Font size class is applied by a simple `watch` inside `app.vue` using `onMounted` guard:

```ts
// app.vue
onMounted(() => {
  watchEffect(() => applyFontSize(fontSize.value))
})
```

`applyFontSize` removes `font-kecil/sedang/besar` from `document.documentElement` and adds the current one. No localStorage ops.

## Modified Files

### New migration: `supabase/migrations/20260619000000_settings_tables.sql`
- Creates `store_config` + `user_preferences` tables
- Seeds `store_config` row
- RLS policies for both tables

### `app/composables/useSettings.ts`
- Add `loadSettings()` async function that fetches both tables
- Returns `storeName`, `fontSize`, `loadSettings`

### `app/plugins/settings-persistence.client.ts`
- **Deleted** (localStorage no longer used)

### `app/app.vue`
- Call `await loadSettings()` in `<script setup>` (SSR-safe)
- Add `onMounted` watcher for font class application
- Keep existing `titleTemplate`

### `app/pages/settings.vue`
- `saveStoreName()` → UPDATE store_config
- `onFontSizeChange()` → UPSERT user_preferences
- Remove any localStorage references

## Error Handling

- `loadSettings()` failure: falls back to defaults (`'Toko Arijaya'`, `'sedang'`), shows no error (non-fatal)
- Save failure: `toast.error(...)` with Indonesian message, state not updated until DB confirms

## TypeScript

After migration, run `pnpm db:types` to regenerate `app/types/database.types.ts`.

## Verification

1. Fresh login → correct store name from DB shows in header + tab title
2. Change store name → log in from different browser → same name appears
3. Change font size → other user account unaffected
4. Clear localStorage → settings still load correctly
5. `npx tsc --noEmit` passes
