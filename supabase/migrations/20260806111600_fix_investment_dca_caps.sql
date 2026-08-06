create or replace function public.claim_auto_dca_schedule(p_worker_id text)
returns setof public.auto_dca_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.auto_dca_schedules%rowtype;
  settings public.auto_dca_settings%rowtype;
  v_day_start timestamptz := date_trunc('day', timezone('Australia/Sydney', now())) at time zone 'Australia/Sydney';
  v_week_start timestamptz := date_trunc('week', timezone('Australia/Sydney', now())) at time zone 'Australia/Sydney';
  v_today_count integer := 0;
  v_today_spent numeric := 0;
  v_week_spent numeric := 0;
begin
  if p_worker_id is null or char_length(trim(p_worker_id)) < 3 then
    return;
  end if;

  select * into settings
  from public.auto_dca_settings
  where id = 1
  for update;

  if not found
    or not settings.enabled
    or not settings.execution_enabled
    or settings.paused
    or settings.emergency_stop
    or settings.wallet_address is null
  then
    return;
  end if;

  if settings.multiwallet_enabled
    or settings.randomized_execution
    or not settings.buy_only
  then
    return;
  end if;

  select
    count(*) filter (where started_at >= v_day_start)::integer,
    coalesce(sum(input_amount) filter (where started_at >= v_day_start), 0),
    coalesce(sum(input_amount) filter (where started_at >= v_week_start), 0)
  into v_today_count, v_today_spent, v_week_spent
  from public.auto_dca_executions
  where status = 'success';

  if v_today_count >= settings.max_buys_per_day
    or v_today_spent >= settings.max_daily_amount
    or v_week_spent >= settings.max_weekly_amount
  then
    return;
  end if;

  select * into claimed
  from public.auto_dca_schedules
  where status = 'active'
    and input_currency = settings.allowed_input_currency
    and amount_per_buy <= settings.max_order_amount
    and v_today_spent + amount_per_buy <= settings.max_daily_amount
    and v_week_spent + amount_per_buy <= settings.max_weekly_amount
    and completed_buys < order_count
    and next_run_at is not null
    and next_run_at <= now()
    and (locked_until is null or locked_until < now())
  order by next_run_at asc, created_at asc
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.auto_dca_schedules
  set locked_by = p_worker_id,
      locked_until = now() + interval '2 minutes',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;

grant execute on function public.claim_auto_dca_schedule(text) to service_role;
