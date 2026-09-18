alter table public.reward_budget_settings
  add column if not exists active_weekly_points_cap integer not null default 2500 check (active_weekly_points_cap > 0),
  add column if not exists weekly_buffer_points_cap integer not null default 500 check (weekly_buffer_points_cap >= 0),
  add column if not exists mission_weekly_points_cap integer not null default 1500 check (mission_weekly_points_cap >= 0),
  add column if not exists referral_weekly_points_cap integer not null default 1000 check (referral_weekly_points_cap >= 0),
  add column if not exists special_weekly_points_cap integer not null default 500 check (special_weekly_points_cap >= 0),
  add column if not exists standard_mission_points integer not null default 20 check (standard_mission_points between 1 and 1000),
  add column if not exists special_offer_points integer not null default 50 check (special_offer_points between 1 and 1000);

update public.reward_budget_settings
set currency = 'AUD',
    weekly_budget_cents = 8000,
    points_per_currency_unit = 38,
    utilization_percent = 100,
    pilot_weekly_points_cap = 3000,
    maximum_weekly_points_cap = 3000,
    mission_pool_percent = 50,
    referral_pool_percent = 33,
    reserve_pool_percent = 17,
    active_weekly_points_cap = 2500,
    weekly_buffer_points_cap = 500,
    mission_weekly_points_cap = 1500,
    referral_weekly_points_cap = 1000,
    special_weekly_points_cap = 500,
    standard_mission_points = 20,
    special_offer_points = 50,
    referral_inviter_points = 20,
    referral_newcomer_points = 10,
    referral_retention_days = 7,
    inviter_weekly_qualified_cap = 20,
    enabled = true,
    cash_redemption_enabled = false,
    updated_at = now()
where id = 'global';

update public.missions
set reward_points = 20,
    updated_at = now()
where status in ('active', 'open');

create or replace function public.enforce_standard_mission_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points integer := 20;
begin
  if new.status in ('active', 'open') then
    select standard_mission_points into v_points
    from public.reward_budget_settings
    where id = 'global';
    new.reward_points := coalesce(v_points, 20);
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_standard_mission_reward_trigger on public.missions;
create trigger enforce_standard_mission_reward_trigger
before insert or update of reward_points, status on public.missions
for each row execute function public.enforce_standard_mission_reward();

create or replace function public.reward_category_for_type(p_reward_type text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_reward_type, '') like 'referral_%' then 'referral'
    when coalesce(p_reward_type, '') in ('mission_points', 'mission') then 'mission'
    else 'reserve'
  end
$$;

create or replace function public.enforce_weekly_reward_budget()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.reward_budget_settings%rowtype;
  v_week_start timestamptz := date_trunc('week', now());
  v_hard_cap integer;
  v_category text;
  v_category_cap integer;
  v_total_used integer;
  v_category_used integer;
begin
  if coalesce(new.points, 0) <= 0 then
    return new;
  end if;

  select * into v_settings
  from public.reward_budget_settings
  where id = 'global'
  for update;

  if not found or not v_settings.enabled then
    return new;
  end if;

  v_hard_cap := v_settings.active_weekly_points_cap + v_settings.weekly_buffer_points_cap;
  v_category := public.reward_category_for_type(new.reward_type);
  v_category_cap := case v_category
    when 'mission' then v_settings.mission_weekly_points_cap
    when 'referral' then v_settings.referral_weekly_points_cap
    else v_settings.special_weekly_points_cap
  end;

  select coalesce(sum(greatest(points, 0)), 0)::integer
    into v_total_used
  from public.rewards
  where created_at >= v_week_start;

  select coalesce(sum(greatest(points, 0)), 0)::integer
    into v_category_used
  from public.rewards
  where created_at >= v_week_start
    and public.reward_category_for_type(reward_type) = v_category;

  if v_total_used + new.points > v_hard_cap then
    raise exception 'weekly_reward_budget_exhausted';
  end if;

  if v_category_used + new.points > v_category_cap then
    raise exception 'reward_category_budget_exhausted';
  end if;

  return new;
end;
$$;

create or replace function public.get_reward_budget_status()
returns table(
  currency text,
  weekly_budget_cents integer,
  effective_weekly_points_cap integer,
  total_used integer,
  mission_cap integer,
  mission_used integer,
  referral_cap integer,
  referral_used integer,
  reserve_cap integer,
  reserve_used integer,
  referral_inviter_points integer,
  referral_newcomer_points integer,
  referral_retention_days integer,
  inviter_weekly_qualified_cap integer,
  cash_redemption_enabled boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.reward_budget_settings%rowtype;
  v_week_start timestamptz := date_trunc('week', now());
begin
  select * into v_settings
  from public.reward_budget_settings
  where id = 'global';

  return query
  select
    v_settings.currency,
    v_settings.weekly_budget_cents,
    v_settings.active_weekly_points_cap + v_settings.weekly_buffer_points_cap,
    coalesce(sum(greatest(r.points, 0)), 0)::integer,
    v_settings.mission_weekly_points_cap,
    coalesce(sum(greatest(r.points, 0)) filter (
      where public.reward_category_for_type(r.reward_type) = 'mission'
    ), 0)::integer,
    v_settings.referral_weekly_points_cap,
    coalesce(sum(greatest(r.points, 0)) filter (
      where public.reward_category_for_type(r.reward_type) = 'referral'
    ), 0)::integer,
    v_settings.special_weekly_points_cap,
    coalesce(sum(greatest(r.points, 0)) filter (
      where public.reward_category_for_type(r.reward_type) = 'reserve'
    ), 0)::integer,
    v_settings.referral_inviter_points,
    v_settings.referral_newcomer_points,
    v_settings.referral_retention_days,
    v_settings.inviter_weekly_qualified_cap,
    v_settings.cash_redemption_enabled
  from public.rewards r
  where r.created_at >= v_week_start;
end;
$$;

create or replace function public.award_special_offer(
  p_telegram_id bigint,
  p_reason text,
  p_awarded_by bigint
)
returns table(outcome text, awarded_points integer, total_points integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.reward_budget_settings%rowtype;
  v_user public.users%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if length(v_reason) < 3 or length(v_reason) > 240 then
    return query select 'invalid_reason'::text, 0, 0;
    return;
  end if;

  select * into v_settings
  from public.reward_budget_settings
  where id = 'global'
  for update;

  select * into v_user
  from public.users
  where telegram_id = p_telegram_id
  for update;

  if not found then
    return query select 'user_not_registered'::text, 0, 0;
    return;
  end if;

  begin
    update public.users
    set points = coalesce(points, 0) + v_settings.special_offer_points,
        updated_at = now()
    where telegram_id = p_telegram_id
    returning * into v_user;

    insert into public.rewards (
      telegram_id, mission_id, points, reward_type, description
    ) values (
      p_telegram_id,
      null,
      v_settings.special_offer_points,
      'special_offer',
      v_reason
    );

    insert into public.reward_transactions (
      telegram_id, mission_id, submission_id, amount, reward_type, reason, awarded_by
    ) values (
      p_telegram_id,
      null,
      null,
      v_settings.special_offer_points,
      'special_offer',
      v_reason,
      p_awarded_by
    );

    insert into public.mission_history (
      mission_id, action, actor_telegram_id, details
    ) values (
      null,
      'special_offer_awarded',
      p_awarded_by,
      jsonb_build_object(
        'telegram_id', p_telegram_id,
        'points', v_settings.special_offer_points,
        'reason', v_reason
      )
    );
  exception
    when others then
      if sqlerrm in ('weekly_reward_budget_exhausted', 'reward_category_budget_exhausted') then
        return query select 'budget_exhausted'::text, 0, coalesce(v_user.points, 0);
        return;
      end if;
      raise;
  end;

  return query select 'awarded'::text, v_settings.special_offer_points, coalesce(v_user.points, 0);
end;
$$;

revoke all on function public.award_special_offer(bigint, text, bigint) from public;
grant execute on function public.award_special_offer(bigint, text, bigint) to service_role;
