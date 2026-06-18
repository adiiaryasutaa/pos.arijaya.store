-- Replace the permissive store_config UPDATE policy with an admin-only restriction.
-- Admin role is set in the user's app_metadata: {"role": "admin"}.
-- app_metadata can only be written by the service role (not the user themselves),
-- so this cannot be self-escalated. Set it via:
--   Supabase Dashboard → Authentication → Users → Edit user → app_metadata

drop policy if exists "Authenticated users can update store_config" on public.store_config;

create policy "Admins can update store_config"
  on public.store_config for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
