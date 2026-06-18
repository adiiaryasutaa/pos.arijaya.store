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
