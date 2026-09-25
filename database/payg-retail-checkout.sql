create or replace function public.checkout_payg_retail_sale(
  p_bed_name text,
  p_minutes integer,
  p_payg_amount numeric,
  p_payment_method text,
  p_product_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_salon_id uuid;

  v_product_sale_id uuid;
  v_retail_total numeric(10,2) := 0;
  v_retail_cost numeric(10,2) := 0;

  v_product_name text;
  v_product_sell_price numeric(10,2);
  v_product_cost_price numeric(10,2);
  v_current_stock integer;
  v_new_stock integer;

  v_item record;
  v_product_count integer := 0;
begin
  v_salon_id := private.current_salon_id();

  if v_salon_id is null then
    raise exception 'Could not determine current salon';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and salon_id = v_salon_id
      and lower(role) in ('owner', 'staff')
  ) then
    raise exception 'Access denied';
  end if;

  if p_minutes is null or p_minutes <= 0 then
    raise exception 'Minutes must be greater than zero';
  end if;

  if p_payg_amount is null or p_payg_amount <= 0 then
    raise exception 'PAYG amount must be greater than zero';
  end if;

  if lower(p_payment_method) not in ('card', 'cash') then
    raise exception 'Payment method must be card or cash';
  end if;

  if p_product_items is null then
    p_product_items := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_product_items) <> 'array' then
    raise exception 'Product items must be an array';
  end if;

  if exists (
    select 1
    from public.bed_sessions
    where salon_id = v_salon_id
      and bed_name = p_bed_name
      and status = 'occupied'
  ) then
    raise exception 'This bed is already occupied';
  end if;

  /*
    RETAIL
  */
  for v_item in
    select
      item.product_id,
      sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_product_items)
      as item(
        product_id uuid,
        quantity integer
      )
    group by item.product_id
  loop
    if v_item.product_id is null then
      raise exception 'Retail product ID is missing';
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Retail quantity must be greater than zero';
    end if;

    select
      name,
      selling_price,
      cost_price,
      stock_quantity
    into
      v_product_name,
      v_product_sell_price,
      v_product_cost_price,
      v_current_stock
    from public.products
    where id = v_item.product_id
      and salon_id = v_salon_id
      and active = true
    for update;

    if not found then
      raise exception 'Retail product not found or inactive';
    end if;

    if v_current_stock < v_item.quantity then
      raise exception 'Not enough stock for %', v_product_name;
    end if;

    v_new_stock :=
      v_current_stock - v_item.quantity;

    v_retail_total :=
      v_retail_total
      + (v_product_sell_price * v_item.quantity);

    v_retail_cost :=
      v_retail_cost
      + (v_product_cost_price * v_item.quantity);

    if v_product_sale_id is null then
      insert into public.product_sales (
        salon_id,
        customer_id,
        payment_method,
        total_amount,
        total_cost,
        created_by
      )
      values (
        v_salon_id,
        null,
        lower(p_payment_method),
        0,
        0,
        auth.uid()
      )
      returning id into v_product_sale_id;
    end if;

    insert into public.product_sale_items (
      sale_id,
      product_id,
      quantity,
      selling_price,
      cost_price
    )
    values (
      v_product_sale_id,
      v_item.product_id,
      v_item.quantity,
      v_product_sell_price,
      v_product_cost_price
    );

    update public.products
    set
      stock_quantity = v_new_stock,
      updated_at = now()
    where id = v_item.product_id
      and salon_id = v_salon_id;

    insert into public.stock_movements (
      salon_id,
      product_id,
      quantity_change,
      balance_after,
      movement_type,
      note,
      created_by
    )
    values (
      v_salon_id,
      v_item.product_id,
      -v_item.quantity,
      v_new_stock,
      'sale',
      'PAYG basket retail sale',
      auth.uid()
    );

    v_product_count :=
      v_product_count + v_item.quantity;
  end loop;

  if v_product_sale_id is not null then
    update public.product_sales
    set
      total_amount = v_retail_total,
      total_cost = v_retail_cost
    where id = v_product_sale_id;
  end if;

  /*
    PAYG SALE
  */
  insert into public.reception_sales (
    customer_id,
    customer_name,
    minutes,
    amount,
    payment_method,
    salon_id
  )
  values (
    null,
    'PAYG',
    p_minutes,
    p_payg_amount,
    lower(p_payment_method),
    v_salon_id
  );

  /*
    BED SESSION
  */
  insert into public.bed_sessions (
    customer_id,
    customer_name,
    bed_name,
    minutes,
    started_at,
    ends_at,
    status,
    salon_id
  )
  values (
    null,
    'PAYG',
    p_bed_name,
    p_minutes,
    now(),
    now() + make_interval(mins => p_minutes),
    'occupied',
    v_salon_id
  );

  return jsonb_build_object(
    'payg_amount', p_payg_amount,
    'retail_sale_id', v_product_sale_id,
    'retail_total', v_retail_total,
    'retail_items', v_product_count,
    'checkout_total', p_payg_amount + v_retail_total
  );
end;
$function$;