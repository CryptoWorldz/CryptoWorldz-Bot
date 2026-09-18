create or replace function public.get_reward_funding_status()
returns table(
  reward_week_start date,
  network text,
  funding_asset text,
  default_payout_asset text,
  allowed_payout_assets text[],
  weekly_target_aud_cents integer,
  weekly_target_points integer,
  recorded_aud_cents integer,
  remaining_aud_cents integer,
  timezone text,
  sol_conversion_policy text,
  auto_transfer_enabled boolean,
  funding_schedule jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.reward_funding_settings%rowtype;
  v_week_start date := public.current_reward_week_start();
  v_recorded integer := 0;
  v_schedule jsonb := '[]'::jsonb;
begin
  select * into v_settings
  from public.reward_funding_settings
  where id = 'global';

  select coalesce(sum(d.aud_value_cents), 0)::integer into v_recorded
  from public.reward_funding_deposits d
  where d.reward_week_start = v_week_start
    and d.status in ('recorded', 'verified');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day_of_week', s.day_of_week,
        'day_label', s.day_label,
        'planned_aud_cents', s.planned_aud_cents
      ) order by s.display_order
    ),
    '[]'::jsonb
  ) into v_schedule
  from public.reward_funding_schedule s
  where s.active = true;

  return query select
    v_week_start,
    v_settings.network,
    v_settings.funding_asset,
    v_settings.default_payout_asset,
    v_settings.allowed_payout_assets,
    v_settings.weekly_target_aud_cents,
    v_settings.weekly_target_points,
    v_recorded,
    greatest(v_settings.weekly_target_aud_cents - v_recorded, 0),
    v_settings.timezone,
    v_settings.sol_conversion_policy,
    v_settings.auto_transfer_enabled,
    v_schedule;
end;
$$;

revoke all on function public.get_reward_funding_status() from public;
grant execute on function public.get_reward_funding_status() to service_role;
