-- Publish products changes over realtime so stock badges stay fresh across the few
-- registers sharing the store. Display-only freshness — overselling is still prevented
-- server-side by the atomic decrement in create_transaction.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;
