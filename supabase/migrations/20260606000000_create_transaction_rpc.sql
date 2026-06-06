-- Atomic transaction creation: inserts transaction + items + decrements stock
-- in a single PL/pgSQL block so partial failures fully roll back.
-- Security: user_id derived from auth.uid() (not caller-supplied) to prevent attribution spoofing.
-- Total and subtotals recomputed server-side to prevent client-side forgery.
drop function if exists public.create_transaction(text, numeric, uuid, jsonb);

create or replace function public.create_transaction(
  p_payment_method text,
  p_items          jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_tx_id          uuid;
  v_item           jsonb;
  v_rows_affected  int;
  v_computed_total numeric := 0;
  v_result         jsonb;
begin
  -- Validate caller is authenticated
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  -- Compute total server-side: price * quantity per item
  select coalesce(sum(
    (it->>'product_price')::numeric * (it->>'quantity')::integer
  ), 0)
  into v_computed_total
  from jsonb_array_elements(p_items) it;

  -- Insert transaction header — user_id from session, total from items
  insert into public.transactions (payment_method, total, user_id)
  values (p_payment_method, v_computed_total, auth.uid())
  returning id into v_tx_id;

  -- Insert items and atomically decrement stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.transaction_items (
      transaction_id,
      product_id,
      product_name,
      product_price,
      quantity,
      subtotal
    ) values (
      v_tx_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'product_price')::numeric,
      (v_item->>'quantity')::integer,
      -- subtotal recomputed, not trusted from client
      (v_item->>'product_price')::numeric * (v_item->>'quantity')::integer
    );

    -- Atomic decrement: only succeeds if stock >= quantity
    update public.products
    set stock = stock - (v_item->>'quantity')::integer
    where id = (v_item->>'product_id')::uuid
      and stock >= (v_item->>'quantity')::integer;

    get diagnostics v_rows_affected = row_count;
    if v_rows_affected = 0 then
      raise exception 'Stok tidak mencukupi untuk produk: %', v_item->>'product_name';
    end if;
  end loop;

  -- Return full transaction with items (includes real DB-generated ids)
  select jsonb_build_object(
    'id',             t.id,
    'payment_method', t.payment_method,
    'total',          t.total,
    'note',           t.note,
    'created_at',     t.created_at,
    'user_id',        t.user_id,
    'transaction_items', (
      select jsonb_agg(jsonb_build_object(
        'id',            ti.id,
        'transaction_id', ti.transaction_id,
        'product_id',    ti.product_id,
        'product_name',  ti.product_name,
        'product_price', ti.product_price,
        'quantity',      ti.quantity,
        'subtotal',      ti.subtotal
      ) order by ti.id)
      from public.transaction_items ti
      where ti.transaction_id = t.id
    )
  )
  into v_result
  from public.transactions t
  where t.id = v_tx_id;

  return v_result;
end;
$$;

grant execute on function public.create_transaction to authenticated;
