-- create_transaction v2: accepts optional p_amount_paid (cash tendered) and persists
-- amount_paid + server-computed change_amount on the transaction.
--
-- Security unchanged from v1: SECURITY DEFINER with a pinned search_path, user_id from
-- auth.uid() (not caller-supplied), total/subtotals recomputed server-side, atomic stock
-- decrement that rolls back the whole transaction if any item is short.
--
-- The old 2-arg signature is dropped: keeping it would make a 2-arg call ambiguous against
-- the new default-arg version.
drop function if exists public.create_transaction(text, jsonb);

create or replace function public.create_transaction(
  p_payment_method text,
  p_items          jsonb,
  p_amount_paid    numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx_id          uuid;
  v_item           jsonb;
  v_rows_affected  int;
  v_computed_total numeric := 0;
  v_change         numeric;
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

  -- Change is derived server-side from the cash tendered; never trusted from client.
  -- Clamped at 0 so an underpayment can't store a negative change.
  if p_amount_paid is not null then
    v_change := greatest(p_amount_paid - v_computed_total, 0);
  end if;

  -- Insert transaction header — user_id from session, total + change from server
  insert into public.transactions (payment_method, total, user_id, amount_paid, change_amount)
  values (p_payment_method, v_computed_total, auth.uid(), p_amount_paid, v_change)
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
    'amount_paid',    t.amount_paid,
    'change_amount',  t.change_amount,
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
