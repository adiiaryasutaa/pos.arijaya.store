# Settings DB Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist store name (global) and font size (per-user) in Supabase instead of localStorage, so settings survive cache clears and sync across devices.

**Architecture:** Two new tables — `store_config` (one row, global) and `user_preferences` (per user_id). `useSettings` composable gains `loadSettings`, `saveStoreName`, `saveFontSize` which call Supabase directly. `app.vue` loads settings via `useAsyncData('settings', loadSettings)` on every initial page load. Font class is applied by a `watchEffect` inside `onMounted` in `app.vue`. The existing localStorage persistence plugin is deleted.

**Tech Stack:** Nuxt 4, Supabase (Postgres + RLS), `@nuxtjs/supabase`, Tailwind CSS v4, TypeScript

## Global Constraints

- All user-facing strings in Bahasa Indonesia
- No `type="number"` inputs — use `type="text" inputmode="numeric"`
- Elder-friendly UX: minimum `h-11`/`h-12` tap targets, `text-lg`/`text-xl` text
- Never edit `app/types/database.types.ts` by hand — always regenerate via `pnpm db:types`
- Migrations are additive — never edit an applied migration file
- Run `pnpm format` after every file edit (Note: no `format` script exists yet — skip this step until added)
- TypeScript check: `npx tsc --noEmit`

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/20260619000000_settings_tables.sql` |
| Regenerate | `app/types/database.types.ts` (via `pnpm db:types`) |
| Modify | `app/composables/useSettings.ts` |
| Delete | `app/plugins/settings-persistence.client.ts` |
| Modify | `app/app.vue` |
| Modify | `app/pages/settings.vue` |
| Modify | `app/pages/login.vue` |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260619000000_settings_tables.sql`

**Interfaces:**
- Produces: `store_config` table (columns: `id int2`, `store_name text`, `updated_at timestamptz`), `user_preferences` table (columns: `user_id uuid`, `font_size text`, `updated_at timestamptz`). These tables are used by Tasks 2–4.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260619000000_settings_tables.sql

-- store_config: single-row global store settings
create table if not exists public.store_config (
  id          int2 primary key default 1,
  store_name  text not null default 'Toko Arijaya',
  updated_at  timestamptz not null default now(),
  constraint store_config_single_row check (id = 1)
);

-- Seed the permanent single row (idempotent)
insert into public.store_config (id) values (1)
  on conflict (id) do nothing;

create trigger store_config_updated_at
  before update on public.store_config
  for each row execute function public.handle_updated_at();

-- user_preferences: per-user display preferences
create table if not exists public.user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  font_size  text not null default 'sedang',
  updated_at timestamptz not null default now(),
  constraint user_preferences_font_size_check
    check (font_size in ('kecil', 'sedang', 'besar'))
);

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.store_config     enable row level security;
alter table public.user_preferences enable row level security;

-- store_config: publicly readable (needed on login page before auth),
--               only authenticated users may update
create policy "Anyone can read store_config"
  on public.store_config for select
  using (true);

create policy "Authenticated users can update store_config"
  on public.store_config for update
  to authenticated using (true) with check (true);

-- user_preferences: users own their row
create policy "Users can read own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration locally**

Requires Docker. Start the local stack if not already running:

```bash
pnpm db:start
```

Then reset (applies all migrations + seed):

```bash
pnpm db:reset
```

Expected output includes: `Applying migration 20260619000000_settings_tables.sql...`

- [ ] **Step 3: Regenerate TypeScript types**

```bash
pnpm db:types
```

Expected: `app/types/database.types.ts` now includes `store_config` and `user_preferences` in the `Tables` type map.

Verify by checking the file for:

```ts
store_config: {
  Row: {
    id: number
    store_name: string
    updated_at: string
  }
  ...
}
user_preferences: {
  Row: {
    font_size: string
    updated_at: string
    user_id: string
  }
  ...
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260619000000_settings_tables.sql app/types/database.types.ts
git commit -m "feat(db): add store_config and user_preferences tables"
```

---

### Task 2: Update `useSettings` composable

**Files:**
- Modify: `app/composables/useSettings.ts`

**Interfaces:**
- Consumes: `Database` type from `@/types/database.types` (added in Task 1), `useSupabaseClient<Database>()`, `useSupabaseUser()` from `@nuxtjs/supabase`
- Produces:
  - `loadSettings(): Promise<void>` — fetches `store_config` + `user_preferences`, updates state
  - `saveStoreName(name: string): Promise<{ error: Error | null }>` — UPDATEs `store_config`
  - `saveFontSize(size: FontSize): Promise<{ error: Error | null }>` — UPSERTs `user_preferences`
  - `storeName: ComputedRef<string>` — unchanged
  - `fontSize: ComputedRef<FontSize>` — unchanged

- [ ] **Step 1: Replace `useSettings.ts` entirely**

```ts
// app/composables/useSettings.ts
import type { Database } from '@/types/database.types'

export type FontSize = 'kecil' | 'sedang' | 'besar'

interface Settings {
  storeName: string
  fontSize: FontSize
}

export function useSettings() {
  const settings = useState<Settings>('settings', () => ({
    storeName: 'Toko Arijaya',
    fontSize: 'sedang',
  }))

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const storeName = computed({
    get: () => settings.value.storeName,
    set: (v) => {
      settings.value.storeName = v
    },
  })

  const fontSize = computed({
    get: () => settings.value.fontSize,
    set: (v) => {
      settings.value.fontSize = v
    },
  })

  async function loadSettings() {
    const [configResult, prefsResult] = await Promise.all([
      supabase.from('store_config').select('store_name').eq('id', 1).single(),
      user.value
        ? supabase
            .from('user_preferences')
            .select('font_size')
            .eq('user_id', user.value.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (configResult.data) {
      settings.value.storeName = configResult.data.store_name
    }
    if (prefsResult.data) {
      settings.value.fontSize = prefsResult.data.font_size as FontSize
    }
  }

  async function saveStoreName(name: string) {
    const { error } = await supabase
      .from('store_config')
      .update({ store_name: name })
      .eq('id', 1)
    if (!error) settings.value.storeName = name
    return { error }
  }

  async function saveFontSize(size: FontSize) {
    if (!user.value) return { error: new Error('Not authenticated') }
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.value.id, font_size: size })
    if (!error) settings.value.fontSize = size
    return { error }
  }

  return { settings, storeName, fontSize, loadSettings, saveStoreName, saveFontSize }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/composables/useSettings.ts
git commit -m "feat(settings): add DB load/save functions to useSettings"
```

---

### Task 3: Update `app.vue` — load settings + font class watcher

**Files:**
- Modify: `app/app.vue`
- Delete: `app/plugins/settings-persistence.client.ts`

**Interfaces:**
- Consumes: `loadSettings()`, `storeName`, `fontSize` from `useSettings()` (Task 2)
- Produces: settings loaded from DB on every initial render; font class applied client-side

- [ ] **Step 1: Delete the localStorage persistence plugin**

```bash
rm app/plugins/settings-persistence.client.ts
```

- [ ] **Step 2: Replace `app.vue` entirely**

```vue
<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'

const { storeName, fontSize, loadSettings } = useSettings()

await useAsyncData('settings', loadSettings)

useHead({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} — ${storeName.value}` : storeName.value,
})

onMounted(() => {
  watchEffect(() => {
    const html = document.documentElement
    html.classList.remove('font-kecil', 'font-sedang', 'font-besar')
    html.classList.add(`font-${fontSize.value}`)
  })
})
</script>

<template>
  <NuxtPage />
  <Toaster rich-colors position="top-center" :duration="3000" />
</template>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/app.vue app/plugins/settings-persistence.client.ts
git commit -m "feat(settings): load from DB in app.vue, apply font class on mount"
```

---

### Task 4: Update `settings.vue` — save to DB

**Files:**
- Modify: `app/pages/settings.vue`

**Interfaces:**
- Consumes: `saveStoreName(name: string)`, `saveFontSize(size: FontSize)` from `useSettings()` (Task 2)

- [ ] **Step 1: Replace the `<script setup>` block in `settings.vue`**

Replace lines 1–53 (the entire `<script setup>` block) with:

```vue
<script setup lang="ts">
import { PhArrowLeft, PhEye, PhEyeSlash } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'
import type { FontSize } from '@/composables/useSettings'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Pengaturan' })

const { storeName, fontSize, saveStoreName, saveFontSize } = useSettings()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// --- Nama Toko ---
const storeNameDraft = ref(storeName.value)
const savingName = ref(false)

watch(storeName, (v) => {
  storeNameDraft.value = v
})

async function handleSaveStoreName() {
  const name = storeNameDraft.value.trim() || 'Toko Arijaya'
  savingName.value = true
  const { error } = await saveStoreName(name)
  savingName.value = false
  if (error) {
    toast.error('Gagal menyimpan nama toko')
  } else {
    toast.success('Nama toko diperbarui')
  }
}

// --- Ukuran Teks ---
async function onFontSizeChange(val: string | string[] | undefined) {
  if (!val || typeof val !== 'string') return
  const { error } = await saveFontSize(val as FontSize)
  if (error) toast.error('Gagal menyimpan ukuran teks')
}

// --- Ganti Password ---
const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const changingPassword = ref(false)

async function changePassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Password tidak cocok')
    return
  }
  changingPassword.value = true
  const { error } = await supabase.auth.updateUser({ password: newPassword.value })
  changingPassword.value = false
  if (error) {
    toast.error('Gagal mengubah password')
  } else {
    toast.success('Password berhasil diubah')
    newPassword.value = ''
    confirmPassword.value = ''
  }
}
</script>
```

- [ ] **Step 2: Update the form submit handler in the template**

In the template, the store name form `@submit.prevent` currently calls `saveStoreName`. Update it to call `handleSaveStoreName`, and add a loading state to the button:

Find:
```html
          <form class="flex flex-col gap-3" @submit.prevent="saveStoreName">
            <Input
              v-model="storeNameDraft"
              class="h-12 text-lg"
              required
              maxlength="60"
              placeholder="Nama toko"
            />
            <Button type="submit" class="h-12 text-lg">
              Simpan Nama Toko
            </Button>
```

Replace with:
```html
          <form class="flex flex-col gap-3" @submit.prevent="handleSaveStoreName">
            <Input
              v-model="storeNameDraft"
              class="h-12 text-lg"
              required
              maxlength="60"
              placeholder="Nama toko"
            />
            <Button type="submit" class="h-12 text-lg" :disabled="savingName">
              <Spinner v-if="savingName" data-icon="inline-start" />
              {{ savingName ? 'Menyimpan...' : 'Simpan Nama Toko' }}
            </Button>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/pages/settings.vue
git commit -m "feat(settings): save store name and font size to Supabase"
```

---

### Task 5: Refresh settings after login

**Files:**
- Modify: `app/pages/login.vue`

**Interfaces:**
- Consumes: `refreshNuxtData('settings')` — built-in Nuxt composable, invalidates the `useAsyncData('settings', ...)` cache in `app.vue` and re-runs `loadSettings` with the now-authenticated user

- [ ] **Step 1: Update the `login()` function in `login.vue`**

Find the current `login()` function (lines 14–27):

```ts
async function login() {
  error.value = ''
  loading.value = true
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (err) {
    error.value = 'Email atau password salah. Coba lagi.'
  } else {
    await navigateTo('/')
  }
}
```

Replace with:

```ts
async function login() {
  error.value = ''
  loading.value = true
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (err) {
    error.value = 'Email atau password salah. Coba lagi.'
  } else {
    await refreshNuxtData('settings')
    await navigateTo('/')
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/pages/login.vue
git commit -m "feat(settings): refresh settings from DB after login"
```

---

### Task 6: Push to remote + verify end-to-end

**Files:** none (infra ops + manual testing)

- [ ] **Step 1: Push migration to remote Supabase**

```bash
pnpm db:push
```

Expected: `Applying migration 20260619000000_settings_tables.sql... done`

If the remote already has data and the seed INSERT conflicts, it will be silently skipped (the `ON CONFLICT DO NOTHING` clause handles this).

- [ ] **Step 2: Verify store name persists across devices**

1. Start dev server: `pnpm dev`
2. Log in → navigate to `/settings`
3. Change store name to e.g. `Warung Bahagia` → click Simpan
4. Open a different browser (or incognito) → log in → confirm store name is `Warung Bahagia` in the header and browser tab

- [ ] **Step 3: Verify font size is per-user**

1. Log in as User A → set font size to Besar
2. Log in as User B (different account) → font size should be Sedang (default)
3. User A reloads → font size still Besar

- [ ] **Step 4: Verify localStorage is no longer used**

1. Open DevTools → Application → Local Storage → confirm no `pos-settings` key is created or read

- [ ] **Step 5: Verify login page shows store name**

1. Log out → confirm login page `<CardTitle>` shows the current store name (fetched from `store_config` as anon)

- [ ] **Step 6: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.
