-- Worldz Automatic Activity Rewards v1
-- Goal: remove routine Admin approvals for ShillPoints and RaidPoints while keeping
-- hard caps, duplicate protection, the existing weekly reward budget, and a ring-fenced
-- Reward Wallet between the Treasury and member payouts.

create table if not exists public.activity_reward_automation_settings (
  id text primary key default 'global' check (id = 'global'),
  enabled boolean not null default true,
  auto_raid_points boolean not null default true,
  auto_shill_points boolean not null default true,
  raid_daily_claim_cap integer not null default 5 check (raid_daily_claim_cap between 1 and 50),
  shill_daily_claim_cap integer not null default 5 check (shill_daily_claim_cap between 1 and 50),
  user_daily_points_cap integer not null default 100 check (user_daily_points_cap between 1 and 1000),
  user_weekly_points_cap integer not null default 300 check (user_weekly_points_cap between 1 and 5000),
  timezone text not null default 'Australia/Sydney',
  exception_review_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.activity_reward_automation_settings(
  id, enabled, auto_raid_points, auto_shill_points,
  raid_daily_claim_cap, shill_daily_claim_cap,
  user_daily_points_cap, user_weekly_points_cap,
  timezone, exception_review_only
) values (
  'global', true, true, true, 5, 5, 100, 300, 'Australia/Sydney', true
)
on conflict (id) do nothing;

alter table public.reward_auto_settings
  add column if not exists funding_source text not null default 'treasury_to_rewards_wallet',
  add column if not exists allocation_mode text not null default 'automatic_capped',
  add column if not exists exception_review_only boolean not null default true,
  add column if not exists direct_treasury_payout boolean not null default false;

update public.reward_auto_settings
set funding_source='treasury_to_rewards_wallet',
    allocation_mode='automatic_capped',
    exception_review_only=true,
    direct_treasury_payout=false,
    updated_at=now()
where id='global';

-- Keep Shills and Raids inside the protected mission/reward pool.
create or replace function public.reward_category_for_type(p_reward_type text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_reward_type, '') like 'referral_%' then 'referral'
    when coalesce(p_reward_type, '') in ('mission_points', 'mission')
      or coalesce(p_reward_type, '') like 'shill_%'
      or coalesce(p_reward_type, '') like 'raid_%'
      then 'mission'
    else 'reserve'
  end
$$;

create or replace function public.get_activity_reward_automation_status(p_telegram_id bigint default null)
returns table(
  enabled boolean,
  auto_raid_points boolean,
  auto_shill_points boolean,
  raid_daily_claim_cap integer,
  shill_daily_claim_cap integer,
  user_daily_points_cap integer,
  user_weekly_points_cap integer,
  raid_claims_today integer,
  shill_claims_today integer,
  points_today integer,
  points_this_week integer,
  funding_source text,
  allocation_mode text,
  pool_percent numeric,
  exception_review_only boolean,
  direct_treasury_payout boolean
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v public.activity_reward_automation_settings%rowtype;
  a public.reward_auto_settings%rowtype;
  v_day_start timestamptz;
  v_week_start timestamptz;
  v_raid_count integer:=0;
  v_shill_count integer:=0;
  v_day_points integer:=0;
  v_week_points integer:=0;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.zed_runtime_authorized() then
    raise exception 'not_authorized';
  end if;

  select * into v from public.activity_reward_automation_settings where id='global';
  select * into a from public.reward_auto_settings where id='global';

  v_day_start := (date_trunc('day', now() at time zone v.timezone) at time zone v.timezone);
  v_week_start := (date_trunc('week', now() at time zone v.timezone) at time zone v.timezone);

  if p_telegram_id is not null then
    select count(*)::integer into v_raid_count
    from public.mission_submissions ms
    where ms.telegram_id=p_telegram_id
      and ms.status='approved'
      and coalesce(ms.reviewed_at,ms.updated_at,ms.submitted_at) >= v_day_start;

    select count(*)::integer into v_shill_count
    from public.social_shill_submissions ss
    where ss.telegram_id=p_telegram_id
      and ss.status='approved'
      and coalesce(ss.reviewed_at,ss.updated_at,ss.created_at) >= v_day_start;

    select coalesce(sum(greatest(r.points,0)),0)::integer into v_day_points
    from public.rewards r
    where r.telegram_id=p_telegram_id and r.created_at>=v_day_start and r.points>0;

    select coalesce(sum(greatest(r.points,0)),0)::integer into v_week_points
    from public.rewards r
    where r.telegram_id=p_telegram_id and r.created_at>=v_week_start and r.points>0;
  end if;

  return query select
    v.enabled, v.auto_raid_points, v.auto_shill_points,
    v.raid_daily_claim_cap, v.shill_daily_claim_cap,
    v.user_daily_points_cap, v.user_weekly_points_cap,
    v_raid_count, v_shill_count, v_day_points, v_week_points,
    coalesce(a.funding_source,'treasury_to_rewards_wallet'),
    coalesce(a.allocation_mode,'automatic_capped'),
    coalesce(a.pool_percent,10),
    v.exception_review_only,
    coalesce(a.direct_treasury_payout,false);
end;
$$;

create or replace function public.auto_award_raid_submission(p_submission_id bigint)
returns table(
  outcome text,
  submission_id bigint,
  telegram_id bigint,
  points_awarded integer,
  total_points integer,
  review_reason text
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.activity_reward_automation_settings%rowtype;
  v_submission public.mission_submissions%rowtype;
  v_mission public.missions%rowtype;
  v_user public.users%rowtype;
  v_day_start timestamptz;
  v_week_start timestamptz;
  v_count integer:=0;
  v_day_points integer:=0;
  v_week_points integer:=0;
  v_result record;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.zed_runtime_authorized() then
    raise exception 'not_authorized';
  end if;

  select * into v_settings from public.activity_reward_automation_settings where id='global';
  if not found or not v_settings.enabled or not v_settings.auto_raid_points then
    return query select 'review_required'::text,p_submission_id,null::bigint,0,0,'automation_disabled'::text;
    return;
  end if;

  select * into v_submission
  from public.mission_submissions
  where id=p_submission_id
  for update;

  if not found then
    return query select 'not_found'::text,p_submission_id,null::bigint,0,0,'submission_not_found'::text;
    return;
  end if;

  select * into v_user from public.users where telegram_id=v_submission.telegram_id;
  if not found then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,0,'registration_required'::text;
    return;
  end if;

  if v_submission.status='approved' then
    return query select 'already_awarded'::text,v_submission.id,v_submission.telegram_id,
      coalesce(v_submission.points_awarded,0),coalesce(v_user.points,0),null::text;
    return;
  end if;
  if v_submission.status<>'pending' then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'submission_not_pending'::text;
    return;
  end if;

  select * into v_mission from public.missions where id=v_submission.mission_id;
  if not found or v_mission.status not in ('active','open') then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_not_active'::text;
    return;
  end if;
  if v_mission.expires_at is not null and v_mission.expires_at<=now() then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_expired'::text;
    return;
  end if;

  v_day_start := (date_trunc('day', now() at time zone v_settings.timezone) at time zone v_settings.timezone);
  v_week_start := (date_trunc('week', now() at time zone v_settings.timezone) at time zone v_settings.timezone);

  select count(*)::integer into v_count
  from public.mission_submissions ms
  where ms.telegram_id=v_submission.telegram_id
    and ms.status='approved'
    and coalesce(ms.reviewed_at,ms.updated_at,ms.submitted_at)>=v_day_start;

  if v_count>=v_settings.raid_daily_claim_cap then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_daily_cap'::text;
    return;
  end if;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_day_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_day_start and r.points>0;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_week_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_week_start and r.points>0;

  if v_day_points + greatest(coalesce(v_mission.reward_points,0),0) > v_settings.user_daily_points_cap then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'daily_points_cap'::text;
    return;
  end if;
  if v_week_points + greatest(coalesce(v_mission.reward_points,0),0) > v_settings.user_weekly_points_cap then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'weekly_points_cap'::text;
    return;
  end if;

  begin
    select * into v_result
    from public.approve_mission_completion(v_submission.id,null)
    limit 1;
  exception
    when others then
      if sqlerrm in ('weekly_reward_budget_exhausted','reward_category_budget_exhausted') then
        return query select 'budget_deferred'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'weekly_pool_full'::text;
        return;
      end if;
      raise;
  end;

  return query select
    'awarded'::text,
    v_submission.id,
    v_submission.telegram_id,
    coalesce(v_result.awarded_points,0),
    coalesce(v_result.total_points,0),
    null::text;
end;
$$;

create or replace function public.auto_award_social_shill_submission(p_submission_id bigint)
returns table(
  outcome text,
  submission_id bigint,
  telegram_id bigint,
  token_symbol text,
  points_awarded integer,
  total_points integer,
  review_reason text
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.activity_reward_automation_settings%rowtype;
  v_submission public.social_shill_submissions%rowtype;
  v_user public.users%rowtype;
  v_token public.shill_reward_tokens%rowtype;
  v_day_start timestamptz;
  v_week_start timestamptz;
  v_count integer:=0;
  v_day_points integer:=0;
  v_week_points integer:=0;
  v_outcome text;
  v_tid bigint;
  v_symbol text;
  v_awarded integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.zed_runtime_authorized() then
    raise exception 'not_authorized';
  end if;

  select * into v_settings from public.activity_reward_automation_settings where id='global';
  if not found or not v_settings.enabled or not v_settings.auto_shill_points then
    return query select 'review_required'::text,p_submission_id,null::bigint,null::text,0,0,'automation_disabled'::text;
    return;
  end if;

  select * into v_submission
  from public.social_shill_submissions
  where id=p_submission_id
  for update;

  if not found then
    return query select 'not_found'::text,p_submission_id,null::bigint,null::text,0,0,'submission_not_found'::text;
    return;
  end if;

  select * into v_user from public.users where telegram_id=v_submission.telegram_id;
  if not found then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,0,'registration_required'::text;
    return;
  end if;

  if v_submission.status='approved' then
    return query select 'already_awarded'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,
      coalesce(v_submission.points_awarded,0),coalesce(v_user.points,0),null::text;
    return;
  end if;
  if v_submission.status<>'pending' then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'submission_not_pending'::text;
    return;
  end if;

  if v_submission.proof_url !~* '^https://[^[:space:]]+$' then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'invalid_public_proof'::text;
    return;
  end if;

  select * into v_token
  from public.shill_reward_tokens
  where symbol=v_submission.token_symbol and enabled=true;

  if not found then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'token_disabled'::text;
    return;
  end if;

  v_day_start := (date_trunc('day', now() at time zone v_settings.timezone) at time zone v_settings.timezone);
  v_week_start := (date_trunc('week', now() at time zone v_settings.timezone) at time zone v_settings.timezone);

  select count(*)::integer into v_count
  from public.social_shill_submissions ss
  where ss.telegram_id=v_submission.telegram_id
    and ss.status='approved'
    and coalesce(ss.reviewed_at,ss.updated_at,ss.created_at)>=v_day_start;

  if v_count>=v_settings.shill_daily_claim_cap then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'shill_daily_cap'::text;
    return;
  end if;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_day_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_day_start and r.points>0;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_week_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_week_start and r.points>0;

  if v_day_points + v_token.points_per_verified_share > v_settings.user_daily_points_cap then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'daily_points_cap'::text;
    return;
  end if;
  if v_week_points + v_token.points_per_verified_share > v_settings.user_weekly_points_cap then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'weekly_points_cap'::text;
    return;
  end if;

  select x.outcome,x.telegram_id,x.token_symbol,x.points_awarded
  into v_outcome,v_tid,v_symbol,v_awarded
  from public.approve_social_shill_submission(v_submission.id,null) x
  limit 1;

  if v_outcome='budget_deferred' then
    return query select 'budget_deferred'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'weekly_pool_full'::text;
    return;
  end if;
  if v_outcome<>'approved' then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),coalesce(v_outcome,'approval_failed');
    return;
  end if;

  select * into v_user from public.users where telegram_id=v_submission.telegram_id;

  return query select
    'awarded'::text,
    v_submission.id,
    v_submission.telegram_id,
    v_submission.token_symbol,
    coalesce(v_awarded,0),
    coalesce(v_user.points,0),
    null::text;
end;
$$;

-- Automatic allocation: if the member already has a wallet, routine weekly
-- allocations no longer enter pending_approval. Missing-wallet and other
-- exception cases remain visible to Admin.
create or replace function public.auto_mark_reward_queue_ready()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.reward_auto_settings%rowtype;
  v_pending integer:=0;
  v_wallet_required integer:=0;
begin
  select * into v_settings from public.reward_auto_settings where id='global';

  if coalesce(v_settings.allocation_mode,'automatic_capped')='automatic_capped'
     and new.status='pending_approval'
     and new.wallet_address is not null
     and trim(new.wallet_address)<>'' then
    new.status:='approved';
    new.approved_by:=null;
    new.approved_at:=coalesce(new.approved_at,now());
  end if;

  return new;
end;
$$;

drop trigger if exists reward_auto_queue_auto_ready_before on public.reward_auto_queue;
create trigger reward_auto_queue_auto_ready_before
before insert or update on public.reward_auto_queue
for each row execute function public.auto_mark_reward_queue_ready();

create or replace function public.sync_reward_auto_batch_status()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_pending integer:=0;
  v_wallet_required integer:=0;
begin
  select count(*)::integer into v_pending
  from public.reward_auto_queue
  where batch_id=new.batch_id and status='pending_approval';

  select count(*)::integer into v_wallet_required
  from public.reward_auto_queue
  where batch_id=new.batch_id and status='wallet_required';

  update public.reward_auto_batches
  set status = case
      when v_pending=0 and v_wallet_required=0 then 'approved'
      else 'partially_approved'
    end,
    updated_at=now()
  where id=new.batch_id;

  return new;
end;
$$;

drop trigger if exists reward_auto_queue_sync_batch_after on public.reward_auto_queue;
create trigger reward_auto_queue_sync_batch_after
after insert or update of status,wallet_address on public.reward_auto_queue
for each row execute function public.sync_reward_auto_batch_status();

update public.project_wallets
set control_policy='Treasury funds a ring-fenced Reward Wallet. ZED automatically awards capped activity points and automatically allocates the weekly Reward Wallet pool to eligible connected wallets. Admin review is exception-only; direct Treasury payouts stay disabled.',
    notes='Treasury is not used as the per-member hot wallet. The Reward Wallet is the spending boundary. Weekly allocation remains capped by reward_auto_settings.pool_percent and the existing reward budget.',
    updated_at=now()
where purpose='rewards';

alter table public.activity_reward_automation_settings enable row level security;
revoke all on public.activity_reward_automation_settings from public,anon,authenticated;
grant select,insert,update,delete on public.activity_reward_automation_settings to service_role;

-- The protected Hostinger ZED runtime may call these through the existing runtime bridge.
revoke all on function public.get_activity_reward_automation_status(bigint) from public,authenticated;
revoke all on function public.auto_award_raid_submission(bigint) from public,authenticated;
revoke all on function public.auto_award_social_shill_submission(bigint) from public,authenticated;
grant execute on function public.get_activity_reward_automation_status(bigint) to anon,service_role;
grant execute on function public.auto_award_raid_submission(bigint) to anon,service_role;
grant execute on function public.auto_award_social_shill_submission(bigint) to anon,service_role;
