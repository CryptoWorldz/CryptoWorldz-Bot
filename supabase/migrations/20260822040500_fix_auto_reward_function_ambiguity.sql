create or replace function public.prepare_auto_reward_batch(
  p_kitty_usdc numeric,
  p_generated_by bigint default null
)
returns table(
  outcome text,
  batch_id bigint,
  reward_week_start date,
  kitty_usdc numeric,
  available_kitty_usdc numeric,
  pool_usdc numeric,
  allocated_usdc numeric,
  total_points integer,
  queued_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.reward_auto_settings%rowtype;
  v_week date := public.current_reward_week_start() - 7;
  v_existing public.reward_auto_batches%rowtype;
  v_batch_id bigint;
  v_reserved numeric(30,6) := 0;
  v_available numeric(30,6) := 0;
  v_pool numeric(30,6) := 0;
  v_allocated numeric(30,6) := 0;
  v_points integer := 0;
  v_count integer := 0;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_settings
  from public.reward_auto_settings
  where id = 'global'
  for update;

  if not found or not v_settings.enabled then
    return query select 'disabled'::text, null::bigint, v_week,
      greatest(coalesce(p_kitty_usdc, 0), 0), 0::numeric, 0::numeric, 0::numeric, 0, 0;
    return;
  end if;

  select * into v_existing
  from public.reward_auto_batches b
  where b.reward_week_start = v_week;

  if found then
    return query select
      'existing'::text,
      v_existing.id,
      v_existing.reward_week_start,
      greatest(coalesce(p_kitty_usdc, 0), 0),
      v_existing.available_kitty_usdc,
      v_existing.pool_usdc,
      v_existing.allocated_usdc,
      v_existing.points_total,
      v_existing.queued_count;
    return;
  end if;

  if p_kitty_usdc is null or p_kitty_usdc < v_settings.minimum_kitty_usdc then
    return query select 'kitty_below_minimum'::text, null::bigint, v_week,
      greatest(coalesce(p_kitty_usdc, 0), 0), greatest(coalesce(p_kitty_usdc, 0), 0),
      0::numeric, 0::numeric, 0, 0;
    return;
  end if;

  select coalesce(sum(q.usdc_amount), 0)::numeric(30,6)
  into v_reserved
  from public.reward_auto_queue q
  where q.status in ('pending_approval','wallet_required','approved');

  v_available := greatest(trunc(p_kitty_usdc - v_reserved, 6), 0);

  if v_available < v_settings.minimum_kitty_usdc then
    return query select 'kitty_below_minimum'::text, null::bigint, v_week,
      p_kitty_usdc, v_available, 0::numeric, 0::numeric, 0, 0;
    return;
  end if;

  v_pool := trunc(v_available * v_settings.pool_percent / 100, 6);
  if v_pool < v_settings.minimum_batch_usdc then
    return query select 'pool_below_minimum'::text, null::bigint, v_week,
      p_kitty_usdc, v_available, v_pool, 0::numeric, 0, 0;
    return;
  end if;

  v_start := (v_week::timestamp at time zone v_settings.timezone);
  v_end := ((v_week + 7)::timestamp at time zone v_settings.timezone);

  select coalesce(sum(x.points), 0)::integer
  into v_points
  from (
    select r.telegram_id, sum(greatest(r.points, 0))::integer as points
    from public.rewards r
    where r.created_at >= v_start
      and r.created_at < v_end
      and r.points > 0
    group by r.telegram_id
  ) x;

  if v_points <= 0 then
    return query select 'no_points'::text, null::bigint, v_week,
      p_kitty_usdc, v_available, v_pool, 0::numeric, 0, 0;
    return;
  end if;

  insert into public.reward_auto_batches(
    reward_week_start, kitty_snapshot_usdc, available_kitty_usdc,
    pool_percent, pool_usdc, points_total, generated_by
  ) values (
    v_week, p_kitty_usdc, v_available,
    v_settings.pool_percent, v_pool, v_points, p_generated_by
  )
  returning id into v_batch_id;

  with earned as (
    select r.telegram_id, sum(greatest(r.points, 0))::integer as legend_points
    from public.rewards r
    where r.created_at >= v_start
      and r.created_at < v_end
      and r.points > 0
    group by r.telegram_id
  ),
  allocations as (
    select
      e.telegram_id,
      e.legend_points,
      round((e.legend_points::numeric / v_points::numeric) * 100, 6) as share_percent,
      trunc(v_pool * e.legend_points::numeric / v_points::numeric, 6) as usdc_amount,
      coalesce(p.preferred_asset, 'USDC') as preferred_asset,
      u.wallet as wallet_address
    from earned e
    join public.users u on u.telegram_id = e.telegram_id
    left join public.member_reward_preferences p on p.telegram_id = e.telegram_id
  )
  insert into public.reward_auto_queue(
    batch_id, telegram_id, legend_points, share_percent, usdc_amount,
    preferred_asset, wallet_address, status
  )
  select
    v_batch_id,
    a.telegram_id,
    a.legend_points,
    a.share_percent,
    a.usdc_amount,
    a.preferred_asset,
    a.wallet_address,
    case when a.wallet_address is null or trim(a.wallet_address) = ''
      then 'wallet_required' else 'pending_approval' end
  from allocations a
  where a.usdc_amount > 0;

  select coalesce(sum(q.usdc_amount), 0)::numeric(30,6), count(*)::integer
  into v_allocated, v_count
  from public.reward_auto_queue q
  where q.batch_id = v_batch_id;

  if v_count = 0 then
    delete from public.reward_auto_batches where id = v_batch_id;
    return query select 'pool_below_minimum'::text, null::bigint, v_week,
      p_kitty_usdc, v_available, v_pool, 0::numeric, v_points, 0;
    return;
  end if;

  update public.reward_auto_batches
  set allocated_usdc = v_allocated,
      queued_count = v_count,
      updated_at = now()
  where id = v_batch_id;

  return query select 'created'::text, v_batch_id, v_week,
    p_kitty_usdc, v_available, v_pool, v_allocated, v_points, v_count;
end;
$$;
