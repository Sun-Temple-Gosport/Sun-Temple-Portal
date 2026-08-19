-- TanSalonOS PAYG Walk-in database changes
-- Added August 2026
--
-- This file records the database changes required for anonymous
-- PAYG walk-in tanning sessions.
--
-- PAYG sessions:
-- - do not require a customer account
-- - do not deduct customer minutes
-- - still record revenue
-- - still create a bed session and timer
-- - remain scoped to the logged-in salon


-- ------------------------------------------------------------
-- 1. Allow anonymous PAYG bed sessions
-- ------------------------------------------------------------

alter table public.bed_sessions
alter column customer_id drop not null;


-- ------------------------------------------------------------
-- 2. Allow anonymous PAYG reception sales
-- ------------------------------------------------------------

alter table public.reception_sales
alter column customer_id drop not null;


-- ------------------------------------------------------------
-- 3. Atomic PAYG sale + bed session
-- ------------------------------------------------------------

create or replace function public.start_payg_bed_session(
  p_bed_name text,
  p_minutes integer,
  p_amount numeric,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  staff_salon_id uuid;
begin
  select salon_id
  into staff_salon_id
  from public.profiles
  where id = auth.uid()
    and lower(role) in ('owner', 'staff');

  if staff_salon_id is null then
    raise exception 'Access denied';
  end if;

  if p_minutes is null or p_minutes <= 0 then
    raise exception 'Minutes must be greater than zero';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Price must be greater than zero';
  end if;

  if lower(p_payment_method) not in ('cash', 'card') then
    raise exception 'Invalid payment method';
  end if;

  if exists (
    select 1
    from public.bed_sessions
    where salon_id = staff_salon_id
      and bed_name = p_bed_name
      and status = 'occupied'
  ) then
    raise exception 'This bed is already occupied';
  end if;

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
    p_amount,
    lower(p_payment_method),
    staff_salon_id
  );

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
    staff_salon_id
  );
end;
$function$;