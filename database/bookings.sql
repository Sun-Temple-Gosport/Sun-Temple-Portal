-- TanSalonOS Bookings database functions
-- Completed September 2026
--
-- This file records the salon-side booking database functions
-- used by the optional TanSalonOS Bookings module.
--
-- Requires the existing Bookings schema, including:
-- - bookings
-- - booking_minute_reservations
-- - salon_booking_settings
-- - salon_opening_hours
-- - salon_features
-- - beds
-- - customers
-- - minute_batches
-- - profiles
--
-- Bookings remain scoped to the logged-in salon.
-- Owner/staff-created bookings reserve customer minutes without
-- deducting the customer's actual minute balance.


-- ------------------------------------------------------------
-- 1. Reserve customer minutes when a booking is created
-- ------------------------------------------------------------

create or replace function public.reserve_customer_booking_minutes()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_unlimited_expires_at timestamptz;
  v_available_minutes bigint;
  v_remaining_to_reserve integer := new.session_minutes;
  v_reserve_now integer;
  batch record;
begin
  if new.status not in ('booked', 'checked_in') then
    return new;
  end if;

  select
    c.unlimited_expires_at
  into
    v_unlimited_expires_at
  from public.customers c
  where c.customer_id = new.customer_id
    and c.salon_id = new.salon_id;

  if v_unlimited_expires_at is not null
     and v_unlimited_expires_at > new.starts_at then
    return new;
  end if;

  perform mb.id
  from public.minute_batches mb
  where mb.customer_id = new.customer_id
    and mb.salon_id = new.salon_id
    and mb.minutes_remaining > 0
    and mb.expires_at > new.starts_at
  order by mb.expires_at asc, mb.id asc
  for update;

  select
    coalesce(
      sum(
        greatest(
          mb.minutes_remaining
          - coalesce(r.minutes_reserved, 0),
          0
        )
      ),
      0
    )
  into
    v_available_minutes
  from public.minute_batches mb
  left join (
    select
      bmr.minute_batch_id,
      sum(bmr.minutes_reserved) as minutes_reserved
    from public.booking_minute_reservations bmr
    join public.bookings b
      on b.id = bmr.booking_id
    where b.salon_id = new.salon_id
      and b.customer_id = new.customer_id
      and b.status in ('booked', 'checked_in')
    group by bmr.minute_batch_id
  ) r
    on r.minute_batch_id = mb.id
  where mb.customer_id = new.customer_id
    and mb.salon_id = new.salon_id
    and mb.minutes_remaining > 0
    and mb.expires_at > new.starts_at;

  if v_available_minutes < new.session_minutes then
    raise exception
      'You do not have enough valid minutes for this booking.';
  end if;

  for batch in
    select
      mb.id,
      greatest(
        mb.minutes_remaining
        - coalesce(r.minutes_reserved, 0),
        0
      ) as available_to_reserve
    from public.minute_batches mb
    left join (
      select
        bmr.minute_batch_id,
        sum(bmr.minutes_reserved) as minutes_reserved
      from public.booking_minute_reservations bmr
      join public.bookings b
        on b.id = bmr.booking_id
      where b.salon_id = new.salon_id
        and b.customer_id = new.customer_id
        and b.status in ('booked', 'checked_in')
      group by bmr.minute_batch_id
    ) r
      on r.minute_batch_id = mb.id
    where mb.customer_id = new.customer_id
      and mb.salon_id = new.salon_id
      and mb.minutes_remaining > 0
      and mb.expires_at > new.starts_at
    order by mb.expires_at asc, mb.id asc
  loop
    exit when v_remaining_to_reserve <= 0;

    v_reserve_now :=
      least(
        batch.available_to_reserve,
        v_remaining_to_reserve
      );

    if v_reserve_now > 0 then
      insert into public.booking_minute_reservations (
        booking_id,
        minute_batch_id,
        salon_id,
        minutes_reserved
      )
      values (
        new.id,
        batch.id,
        new.salon_id,
        v_reserve_now
      );

      v_remaining_to_reserve :=
        v_remaining_to_reserve - v_reserve_now;
    end if;
  end loop;

  if v_remaining_to_reserve > 0 then
    raise exception
      'You do not have enough valid minutes for this booking.';
  end if;

  return new;
end;
$function$;


drop trigger if exists
  reserve_customer_booking_minutes_trigger
on public.bookings;

create trigger reserve_customer_booking_minutes_trigger
after insert on public.bookings
for each row
execute function public.reserve_customer_booking_minutes();


-- ------------------------------------------------------------
-- 2. Salon-side booking availability
-- ------------------------------------------------------------

create or replace function public.get_salon_booking_availability(
  p_customer_id uuid,
  p_booking_date date,
  p_session_minutes integer
)
returns table(
  bed_id bigint,
  bed_name text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'private'
as $function$
declare
  v_user_id uuid;
  v_salon_id uuid;
  v_role text;

  v_timezone text;
  v_slot_interval integer;
  v_prep_minutes integer;
  v_turnaround_minutes integer;
  v_max_days_ahead integer;

  v_day_of_week smallint;
  v_open_time time;
  v_close_time time;
  v_closed boolean;

  v_local_now timestamp without time zone;
  v_slot_local timestamp without time zone;
  v_slot_end_local timestamp without time zone;
  v_slot_start_utc timestamptz;
  v_slot_end_utc timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select
    p.salon_id,
    lower(p.role)
  into
    v_salon_id,
    v_role
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_salon_id is null
     or v_role not in ('owner', 'staff') then
    raise exception 'Access denied.';
  end if;

  if not exists (
    select 1
    from public.salon_features sf
    where sf.salon_id = v_salon_id
      and sf.feature_key = 'bookings'
      and sf.enabled = true
  ) then
    raise exception 'Bookings are not enabled for this salon.';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.customer_id = p_customer_id
      and c.salon_id = v_salon_id
  ) then
    raise exception 'Customer does not belong to this salon.';
  end if;

  select
    s.timezone,
    s.slot_interval_minutes,
    s.prep_minutes,
    s.turnaround_minutes,
    s.max_days_ahead
  into
    v_timezone,
    v_slot_interval,
    v_prep_minutes,
    v_turnaround_minutes,
    v_max_days_ahead
  from public.salon_booking_settings s
  where s.salon_id = v_salon_id;

  if not found then
    raise exception 'Booking settings have not been configured.';
  end if;

  if p_session_minutes <= 0 then
    raise exception 'Session minutes must be greater than zero.';
  end if;

  v_local_now := now() at time zone v_timezone;

  if p_booking_date < v_local_now::date then
    raise exception 'Bookings cannot be made in the past.';
  end if;

  if p_booking_date >
     v_local_now::date + v_max_days_ahead then
    raise exception 'That date is too far in advance.';
  end if;

  v_day_of_week :=
    extract(isodow from p_booking_date)::smallint;

  select
    h.open_time,
    h.close_time,
    h.closed
  into
    v_open_time,
    v_close_time,
    v_closed
  from public.salon_opening_hours h
  where h.salon_id = v_salon_id
    and h.day_of_week = v_day_of_week;

  if not found or v_closed then
    return;
  end if;

  v_slot_local :=
    p_booking_date + v_open_time;

  while v_slot_local::date = p_booking_date loop
    v_slot_end_local :=
      v_slot_local
      + make_interval(
          mins =>
            v_prep_minutes
            + p_session_minutes
            + v_turnaround_minutes
        );

    exit when v_slot_end_local::time > v_close_time;

    if v_slot_local > v_local_now then
      v_slot_start_utc :=
        v_slot_local at time zone v_timezone;

      v_slot_end_utc :=
        v_slot_end_local at time zone v_timezone;

      return query
      select
        b.id,
        b.name,
        v_slot_start_utc,
        v_slot_end_utc
      from public.beds b
      where b.salon_id = v_salon_id
        and b.active = true

        and not exists (
          select 1
          from public.bookings existing_bed
          where existing_bed.salon_id = v_salon_id
            and existing_bed.bed_id = b.id
            and existing_bed.status in (
              'booked',
              'checked_in'
            )
            and tstzrange(
              existing_bed.starts_at,
              existing_bed.ends_at,
              '[)'
            ) &&
            tstzrange(
              v_slot_start_utc,
              v_slot_end_utc,
              '[)'
            )
        )

        and not exists (
          select 1
          from public.bookings existing_customer
          where existing_customer.salon_id = v_salon_id
            and existing_customer.customer_id =
              p_customer_id
            and existing_customer.status in (
              'booked',
              'checked_in'
            )
            and tstzrange(
              existing_customer.starts_at,
              existing_customer.ends_at,
              '[)'
            ) &&
            tstzrange(
              v_slot_start_utc,
              v_slot_end_utc,
              '[)'
            )
        )

      order by b.name;
    end if;

    v_slot_local :=
      v_slot_local
      + make_interval(mins => v_slot_interval);
  end loop;
end;
$function$;


-- ------------------------------------------------------------
-- 3. Owner/staff create booking
-- ------------------------------------------------------------

create or replace function public.create_salon_booking(
  p_customer_id uuid,
  p_bed_id bigint,
  p_starts_at timestamp with time zone,
  p_session_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'private'
as $function$
declare
  v_user_id uuid;
  v_salon_id uuid;
  v_role text;

  v_timezone text;
  v_slot_interval integer;
  v_prep_minutes integer;
  v_turnaround_minutes integer;
  v_max_days_ahead integer;

  v_ends_at timestamptz;
  v_local_start timestamp without time zone;
  v_local_end timestamp without time zone;
  v_day_of_week smallint;

  v_open_time time;
  v_close_time time;
  v_closed boolean;

  v_booking_id uuid;
  v_constraint_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select
    p.salon_id,
    lower(p.role)
  into
    v_salon_id,
    v_role
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_salon_id is null
     or v_role not in ('owner', 'staff') then
    raise exception 'Access denied.';
  end if;

  if not exists (
    select 1
    from public.salon_features sf
    where sf.salon_id = v_salon_id
      and sf.feature_key = 'bookings'
      and sf.enabled = true
  ) then
    raise exception 'Bookings are not enabled for this salon.';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.customer_id = p_customer_id
      and c.salon_id = v_salon_id
  ) then
    raise exception 'Customer does not belong to this salon.';
  end if;

  select
    s.timezone,
    s.slot_interval_minutes,
    s.prep_minutes,
    s.turnaround_minutes,
    s.max_days_ahead
  into
    v_timezone,
    v_slot_interval,
    v_prep_minutes,
    v_turnaround_minutes,
    v_max_days_ahead
  from public.salon_booking_settings s
  where s.salon_id = v_salon_id;

  if not found then
    raise exception 'Booking settings have not been configured.';
  end if;

  if p_session_minutes <= 0 then
    raise exception 'Session minutes must be greater than zero.';
  end if;

  if p_starts_at <= now() then
    raise exception 'Bookings must be in the future.';
  end if;

  if not exists (
    select 1
    from public.beds b
    where b.id = p_bed_id
      and b.salon_id = v_salon_id
      and b.active = true
  ) then
    raise exception 'That sunbed is not available.';
  end if;

  v_ends_at :=
    p_starts_at
    + make_interval(
        mins =>
          v_prep_minutes
          + p_session_minutes
          + v_turnaround_minutes
      );

  v_local_start :=
    p_starts_at at time zone v_timezone;

  v_local_end :=
    v_ends_at at time zone v_timezone;

  if v_local_start::date >
     (
       (now() at time zone v_timezone)::date
       + v_max_days_ahead
     ) then
    raise exception 'That date is too far in advance.';
  end if;

  if extract(second from v_local_start) <> 0
     or (
       extract(minute from v_local_start)::integer
       % v_slot_interval
     ) <> 0 then
    raise exception 'That start time is not a valid booking slot.';
  end if;

  if v_local_start::date <> v_local_end::date then
    raise exception 'The booking must finish on the same day.';
  end if;

  v_day_of_week :=
    extract(isodow from v_local_start)::smallint;

  select
    h.open_time,
    h.close_time,
    h.closed
  into
    v_open_time,
    v_close_time,
    v_closed
  from public.salon_opening_hours h
  where h.salon_id = v_salon_id
    and h.day_of_week = v_day_of_week;

  if not found or v_closed then
    raise exception 'The salon is closed at that time.';
  end if;

  if v_local_start::time < v_open_time
     or v_local_end::time > v_close_time then
    raise exception
      'That booking falls outside salon opening hours.';
  end if;

  insert into public.bookings (
    salon_id,
    customer_id,
    bed_id,
    starts_at,
    ends_at,
    session_minutes,
    prep_minutes,
    turnaround_minutes,
    status,
    source
  )
  values (
    v_salon_id,
    p_customer_id,
    p_bed_id,
    p_starts_at,
    v_ends_at,
    p_session_minutes,
    v_prep_minutes,
    v_turnaround_minutes,
    'booked',
    v_role
  )
  returning id into v_booking_id;

  return v_booking_id;

exception
  when exclusion_violation then
    get stacked diagnostics
      v_constraint_name = constraint_name;

    if v_constraint_name =
      'bookings_no_overlapping_customer' then
      raise exception
        'This customer already has another booking at that time.';
    elsif v_constraint_name =
      'bookings_no_overlapping_beds' then
      raise exception
        'That sunbed is no longer available at that time.';
    else
      raise;
    end if;
end;
$function$;


-- ------------------------------------------------------------
-- 4. Owner/staff cancel booking
-- ------------------------------------------------------------

create or replace function public.cancel_salon_booking(
  p_booking_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'private'
as $function$
declare
  v_user_id uuid;
  v_salon_id uuid;
  v_role text;
  v_booking_status text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select
    p.salon_id,
    lower(p.role)
  into
    v_salon_id,
    v_role
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_salon_id is null
     or v_role not in ('owner', 'staff') then
    raise exception 'Access denied.';
  end if;

  select
    b.status
  into
    v_booking_status
  from public.bookings b
  where b.id = p_booking_id
    and b.salon_id = v_salon_id
  for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking_status <> 'booked' then
    raise exception 'Only booked appointments can be cancelled.';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id
    and salon_id = v_salon_id;

  delete from public.booking_minute_reservations
  where booking_id = p_booking_id
    and salon_id = v_salon_id;
end;
$function$;


-- ------------------------------------------------------------
-- 5. Owner/staff reschedule booking
-- ------------------------------------------------------------

create or replace function public.reschedule_salon_booking(
  p_booking_id uuid,
  p_bed_id bigint,
  p_starts_at timestamp with time zone,
  p_session_minutes integer
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'private'
as $function$
declare
  v_user_id uuid;
  v_salon_id uuid;
  v_role text;

  v_customer_id uuid;
  v_booking_status text;

  v_timezone text;
  v_slot_interval integer;
  v_prep_minutes integer;
  v_turnaround_minutes integer;
  v_max_days_ahead integer;

  v_ends_at timestamptz;
  v_local_start timestamp without time zone;
  v_local_end timestamp without time zone;
  v_day_of_week smallint;

  v_open_time time;
  v_close_time time;
  v_closed boolean;

  v_unlimited_expires_at timestamptz;
  v_available_minutes bigint;
  v_remaining_to_reserve integer;
  v_reserve_now integer;

  v_constraint_name text;

  batch record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select
    p.salon_id,
    lower(p.role)
  into
    v_salon_id,
    v_role
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_salon_id is null
     or v_role not in ('owner', 'staff') then
    raise exception 'Access denied.';
  end if;

  if not exists (
    select 1
    from public.salon_features sf
    where sf.salon_id = v_salon_id
      and sf.feature_key = 'bookings'
      and sf.enabled = true
  ) then
    raise exception 'Bookings are not enabled for this salon.';
  end if;

  select
    b.customer_id,
    b.status
  into
    v_customer_id,
    v_booking_status
  from public.bookings b
  where b.id = p_booking_id
    and b.salon_id = v_salon_id
  for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking_status <> 'booked' then
    raise exception 'Only booked appointments can be rescheduled.';
  end if;

  select
    s.timezone,
    s.slot_interval_minutes,
    s.prep_minutes,
    s.turnaround_minutes,
    s.max_days_ahead
  into
    v_timezone,
    v_slot_interval,
    v_prep_minutes,
    v_turnaround_minutes,
    v_max_days_ahead
  from public.salon_booking_settings s
  where s.salon_id = v_salon_id;

  if not found then
    raise exception 'Booking settings have not been configured.';
  end if;

  if p_session_minutes <= 0 then
    raise exception 'Session minutes must be greater than zero.';
  end if;

  if p_starts_at <= now() then
    raise exception 'Bookings must be in the future.';
  end if;

  if not exists (
    select 1
    from public.beds b
    where b.id = p_bed_id
      and b.salon_id = v_salon_id
      and b.active = true
  ) then
    raise exception 'That sunbed is not available.';
  end if;

  v_ends_at :=
    p_starts_at
    + make_interval(
        mins =>
          v_prep_minutes
          + p_session_minutes
          + v_turnaround_minutes
      );

  v_local_start :=
    p_starts_at at time zone v_timezone;

  v_local_end :=
    v_ends_at at time zone v_timezone;

  if v_local_start::date >
     (
       (now() at time zone v_timezone)::date
       + v_max_days_ahead
     ) then
    raise exception 'That date is too far in advance.';
  end if;

  if extract(second from v_local_start) <> 0
     or (
       extract(minute from v_local_start)::integer
       % v_slot_interval
     ) <> 0 then
    raise exception 'That start time is not a valid booking slot.';
  end if;

  if v_local_start::date <> v_local_end::date then
    raise exception 'The booking must finish on the same day.';
  end if;

  v_day_of_week :=
    extract(isodow from v_local_start)::smallint;

  select
    h.open_time,
    h.close_time,
    h.closed
  into
    v_open_time,
    v_close_time,
    v_closed
  from public.salon_opening_hours h
  where h.salon_id = v_salon_id
    and h.day_of_week = v_day_of_week;

  if not found or v_closed then
    raise exception 'The salon is closed at that time.';
  end if;

  if v_local_start::time < v_open_time
     or v_local_end::time > v_close_time then
    raise exception
      'That booking falls outside salon opening hours.';
  end if;

  delete from public.booking_minute_reservations
  where booking_id = p_booking_id
    and salon_id = v_salon_id;

  update public.bookings
  set
    bed_id = p_bed_id,
    starts_at = p_starts_at,
    ends_at = v_ends_at,
    session_minutes = p_session_minutes,
    prep_minutes = v_prep_minutes,
    turnaround_minutes = v_turnaround_minutes
  where id = p_booking_id
    and salon_id = v_salon_id;

  select
    c.unlimited_expires_at
  into
    v_unlimited_expires_at
  from public.customers c
  where c.customer_id = v_customer_id
    and c.salon_id = v_salon_id;

  if v_unlimited_expires_at is not null
     and v_unlimited_expires_at > p_starts_at then
    return;
  end if;

  perform mb.id
  from public.minute_batches mb
  where mb.customer_id = v_customer_id
    and mb.salon_id = v_salon_id
    and mb.minutes_remaining > 0
    and mb.expires_at > p_starts_at
  order by mb.expires_at asc, mb.id asc
  for update;

  select
    coalesce(
      sum(
        greatest(
          mb.minutes_remaining
          - coalesce(r.minutes_reserved, 0),
          0
        )
      ),
      0
    )
  into
    v_available_minutes
  from public.minute_batches mb
  left join (
    select
      bmr.minute_batch_id,
      sum(bmr.minutes_reserved) as minutes_reserved
    from public.booking_minute_reservations bmr
    join public.bookings b
      on b.id = bmr.booking_id
    where b.salon_id = v_salon_id
      and b.customer_id = v_customer_id
      and b.status in ('booked', 'checked_in')
    group by bmr.minute_batch_id
  ) r
    on r.minute_batch_id = mb.id
  where mb.customer_id = v_customer_id
    and mb.salon_id = v_salon_id
    and mb.minutes_remaining > 0
    and mb.expires_at > p_starts_at;

  if v_available_minutes < p_session_minutes then
    raise exception
      'You do not have enough valid minutes for this booking.';
  end if;

  v_remaining_to_reserve := p_session_minutes;

  for batch in
    select
      mb.id,
      greatest(
        mb.minutes_remaining
        - coalesce(r.minutes_reserved, 0),
        0
      ) as available_to_reserve
    from public.minute_batches mb
    left join (
      select
        bmr.minute_batch_id,
        sum(bmr.minutes_reserved) as minutes_reserved
      from public.booking_minute_reservations bmr
      join public.bookings b
        on b.id = bmr.booking_id
      where b.salon_id = v_salon_id
        and b.customer_id = v_customer_id
        and b.status in ('booked', 'checked_in')
      group by bmr.minute_batch_id
    ) r
      on r.minute_batch_id = mb.id
    where mb.customer_id = v_customer_id
      and mb.salon_id = v_salon_id
      and mb.minutes_remaining > 0
      and mb.expires_at > p_starts_at
    order by mb.expires_at asc, mb.id asc
  loop
    exit when v_remaining_to_reserve <= 0;

    v_reserve_now :=
      least(
        batch.available_to_reserve,
        v_remaining_to_reserve
      );

    if v_reserve_now > 0 then
      insert into public.booking_minute_reservations (
        booking_id,
        minute_batch_id,
        salon_id,
        minutes_reserved
      )
      values (
        p_booking_id,
        batch.id,
        v_salon_id,
        v_reserve_now
      );

      v_remaining_to_reserve :=
        v_remaining_to_reserve - v_reserve_now;
    end if;
  end loop;

  if v_remaining_to_reserve > 0 then
    raise exception
      'You do not have enough valid minutes for this booking.';
  end if;

exception
  when exclusion_violation then
    get stacked diagnostics
      v_constraint_name = constraint_name;

    if v_constraint_name =
      'bookings_no_overlapping_customer' then
      raise exception
        'This customer already has another booking at that time.';
    elsif v_constraint_name =
      'bookings_no_overlapping_beds' then
      raise exception
        'That sunbed is no longer available at that time.';
    else
      raise;
    end if;
end;
$function$;


-- ------------------------------------------------------------
-- 6. Reschedule-aware availability
-- ------------------------------------------------------------

create or replace function public.get_salon_reschedule_availability(
  p_booking_id uuid,
  p_booking_date date,
  p_session_minutes integer
)
returns table(
  bed_id bigint,
  bed_name text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'private'
as $function$
declare
  v_user_id uuid;
  v_salon_id uuid;
  v_role text;

  v_customer_id uuid;
  v_booking_status text;

  v_timezone text;
  v_slot_interval integer;
  v_prep_minutes integer;
  v_turnaround_minutes integer;
  v_max_days_ahead integer;

  v_day_of_week smallint;
  v_open_time time;
  v_close_time time;
  v_closed boolean;

  v_local_now timestamp without time zone;
  v_slot_local timestamp without time zone;
  v_slot_end_local timestamp without time zone;
  v_slot_start_utc timestamptz;
  v_slot_end_utc timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select
    p.salon_id,
    lower(p.role)
  into
    v_salon_id,
    v_role
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_salon_id is null
     or v_role not in ('owner', 'staff') then
    raise exception 'Access denied.';
  end if;

  if not exists (
    select 1
    from public.salon_features sf
    where sf.salon_id = v_salon_id
      and sf.feature_key = 'bookings'
      and sf.enabled = true
  ) then
    raise exception 'Bookings are not enabled for this salon.';
  end if;

  select
    b.customer_id,
    b.status
  into
    v_customer_id,
    v_booking_status
  from public.bookings b
  where b.id = p_booking_id
    and b.salon_id = v_salon_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking_status <> 'booked' then
    raise exception 'Only booked appointments can be rescheduled.';
  end if;

  select
    s.timezone,
    s.slot_interval_minutes,
    s.prep_minutes,
    s.turnaround_minutes,
    s.max_days_ahead
  into
    v_timezone,
    v_slot_interval,
    v_prep_minutes,
    v_turnaround_minutes,
    v_max_days_ahead
  from public.salon_booking_settings s
  where s.salon_id = v_salon_id;

  if not found then
    raise exception 'Booking settings have not been configured.';
  end if;

  if p_session_minutes <= 0 then
    raise exception 'Session minutes must be greater than zero.';
  end if;

  v_local_now := now() at time zone v_timezone;

  if p_booking_date < v_local_now::date then
    raise exception 'Bookings cannot be made in the past.';
  end if;

  if p_booking_date >
     v_local_now::date + v_max_days_ahead then
    raise exception 'That date is too far in advance.';
  end if;

  v_day_of_week :=
    extract(isodow from p_booking_date)::smallint;

  select
    h.open_time,
    h.close_time,
    h.closed
  into
    v_open_time,
    v_close_time,
    v_closed
  from public.salon_opening_hours h
  where h.salon_id = v_salon_id
    and h.day_of_week = v_day_of_week;

  if not found or v_closed then
    return;
  end if;

  v_slot_local :=
    p_booking_date + v_open_time;

  while v_slot_local::date = p_booking_date loop
    v_slot_end_local :=
      v_slot_local
      + make_interval(
          mins =>
            v_prep_minutes
            + p_session_minutes
            + v_turnaround_minutes
        );

    exit when v_slot_end_local::time > v_close_time;

    if v_slot_local > v_local_now then
      v_slot_start_utc :=
        v_slot_local at time zone v_timezone;

      v_slot_end_utc :=
        v_slot_end_local at time zone v_timezone;

      return query
      select
        b.id,
        b.name,
        v_slot_start_utc,
        v_slot_end_utc
      from public.beds b
      where b.salon_id = v_salon_id
        and b.active = true

        and not exists (
          select 1
          from public.bookings existing_bed
          where existing_bed.salon_id = v_salon_id
            and existing_bed.id <> p_booking_id
            and existing_bed.bed_id = b.id
            and existing_bed.status in (
              'booked',
              'checked_in'
            )
            and tstzrange(
              existing_bed.starts_at,
              existing_bed.ends_at,
              '[)'
            ) &&
            tstzrange(
              v_slot_start_utc,
              v_slot_end_utc,
              '[)'
            )
        )

        and not exists (
          select 1
          from public.bookings existing_customer
          where existing_customer.salon_id = v_salon_id
            and existing_customer.id <> p_booking_id
            and existing_customer.customer_id =
              v_customer_id
            and existing_customer.status in (
              'booked',
              'checked_in'
            )
            and tstzrange(
              existing_customer.starts_at,
              existing_customer.ends_at,
              '[)'
            ) &&
            tstzrange(
              v_slot_start_utc,
              v_slot_end_utc,
              '[)'
            )
        )

      order by b.name;
    end if;

    v_slot_local :=
      v_slot_local
      + make_interval(mins => v_slot_interval);
  end loop;
end;
$function$;