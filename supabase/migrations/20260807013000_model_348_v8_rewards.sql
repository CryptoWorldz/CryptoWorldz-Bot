-- Model-348 V8 reward architecture.
-- Purchase/holding-based cash or Legend Point inducements are deliberately not enabled.
-- Token-support statuses are recognition-only and require a later compliance-reviewed verifier.

alter table public.reward_budget_settings
  add column if not exists reserve_weekly_points_cap integer not null default 1500 check (reserve_weekly_points_cap >= 0),
  add column if not exists reserve_enabled boolean not null default false,
  add column if not exists shill_boost_points integer not null default 20 check (shill_boost_points between 1 and 100),
  add column if not exists shill_boost_weekly_inviter_cap integer not null default 15 check (shill_boost_weekly_inviter_cap between 1 and 50),
  add column if not exists special_tier_20_weekly_user_cap integer not null default 15 check (special_tier_20_weekly_user_cap between 1 and 100),
  add column if not exists special_tier_50_weekly_user_cap integer not null default 10 check (special_tier_50_weekly_user_cap between 1 and 100),
  add column if not exists special_tier_100_weekly_user_cap integer not null default 5 check (special_tier_100_weekly_user_cap between 1 and 100),
  add column if not exists unique_legend_points integer not null default 250 check (unique_legend_points between 1 and 1000),
  add column if not exists unique_legend_cooldown_days integer not null default 90 check (unique_legend_cooldown_days between 30 and 365);

update public.reward_budget_settings
set weekly_budget_cents = 10000,
    points_per_currency_unit = 50,
    utilization_percent = 100,
    pilot_weekly_points_cap = 3500,
    active_weekly_points_cap = 3500,
    weekly_buffer_points_cap = 1500,
    maximum_weekly_points_cap = 5000,
    mission_weekly_points_cap = 1500,
    referral_weekly_points_cap = 1000,
    special_weekly_points_cap = 1000,
    reserve_weekly_points_cap = 1500,
    reserve_enabled = false,
    referral_inviter_points = 20,
    referral_newcomer_points = 10,
    referral_retention_days = 7,
    inviter_weekly_qualified_cap = 20,
    standard_mission_points = 20,
    special_offer_points = 50,
    shill_boost_points = 20,
    shill_boost_weekly_inviter_cap = 15,
    special_tier_20_weekly_user_cap = 15,
    special_tier_50_weekly_user_cap = 10,
    special_tier_100_weekly_user_cap = 5,
    unique_legend_points = 250,
    unique_legend_cooldown_days = 90,
    updated_at = now()
where id = 'global';

create or replace function public.reward_category_for_type(p_reward_type text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_reward_type, '') like 'referral_%' then 'referral'
    when coalesce(p_reward_type, '') in ('mission_points', 'mission') then 'mission'
    when coalesce(p_reward_type, '') in ('owner_reserve_unique_legend', 'owner_reserve_manual') then 'reserve'
    else 'special'
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
  v_category text;
  v_category_cap integer;
  v_total_used integer;
  v_active_used integer;
  v_category_used integer;
begin
  if coalesce(new.points, 0) <= 0 then return new; end if;

  select * into v_settings
  from public.reward_budget_settings
  where id = 'global'
  for update;

  if not found or not v_settings.enabled then return new; end if;

  v_category := public.reward_category_for_type(new.reward_type);
  v_category_cap := case v_category
    when 'mission' then v_settings.mission_weekly_points_cap
    when 'referral' then v_settings.referral_weekly_points_cap
    when 'reserve' then v_settings.reserve_weekly_points_cap
    else v_settings.special_weekly_points_cap
  end;

  if v_category = 'reserve' and not v_settings.reserve_enabled then
    raise exception 'reward_reserve_locked';
  end if;

  select coalesce(sum(greatest(points, 0)), 0)::integer
  into v_total_used
  from public.rewards
  where created_at >= v_week_start;

  select coalesce(sum(greatest(points, 0)), 0)::integer
  into v_active_used
  from public.rewards
  where created_at >= v_week_start
    and public.reward_category_for_type(reward_type) <> 'reserve';

  select coalesce(sum(greatest(points, 0)), 0)::integer
  into v_category_used
  from public.rewards
  where created_at >= v_week_start
    and public.reward_category_for_type(reward_type) = v_category;

  if v_total_used + new.points > v_settings.maximum_weekly_points_cap then
    raise exception 'weekly_reward_budget_exhausted';
  end if;

  if v_category <> 'reserve' and v_active_used + new.points > v_settings.active_weekly_points_cap then
    raise exception 'active_reward_budget_exhausted';
  end if;

  if v_category_used + new.points > v_category_cap then
    raise exception 'reward_category_budget_exhausted';
  end if;

  return new;
end;
$$;

drop function if exists public.get_reward_budget_status();
create function public.get_reward_budget_status()
returns table(
  currency text,
  weekly_budget_cents integer,
  effective_weekly_points_cap integer,
  active_weekly_points_cap integer,
  active_used integer,
  total_used integer,
  mission_cap integer,
  mission_used integer,
  referral_cap integer,
  referral_used integer,
  special_cap integer,
  special_used integer,
  reserve_cap integer,
  reserve_used integer,
  reserve_enabled boolean,
  referral_inviter_points integer,
  referral_newcomer_points integer,
  referral_retention_days integer,
  inviter_weekly_qualified_cap integer,
  shill_boost_points integer,
  shill_boost_weekly_inviter_cap integer,
  special_tier_20_weekly_user_cap integer,
  special_tier_50_weekly_user_cap integer,
  special_tier_100_weekly_user_cap integer,
  unique_legend_points integer,
  unique_legend_cooldown_days integer,
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
  select * into v_settings from public.reward_budget_settings where id = 'global';

  return query
  select
    v_settings.currency,
    v_settings.weekly_budget_cents,
    v_settings.maximum_weekly_points_cap,
    v_settings.active_weekly_points_cap,
    coalesce(sum(greatest(r.points, 0)) filter (
      where public.reward_category_for_type(r.reward_type) <> 'reserve'
    ), 0)::integer,
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
      where public.reward_category_for_type(r.reward_type) = 'special'
    ), 0)::integer,
    v_settings.reserve_weekly_points_cap,
    coalesce(sum(greatest(r.points, 0)) filter (
      where public.reward_category_for_type(r.reward_type) = 'reserve'
    ), 0)::integer,
    v_settings.reserve_enabled,
    v_settings.referral_inviter_points,
    v_settings.referral_newcomer_points,
    v_settings.referral_retention_days,
    v_settings.inviter_weekly_qualified_cap,
    v_settings.shill_boost_points,
    v_settings.shill_boost_weekly_inviter_cap,
    v_settings.special_tier_20_weekly_user_cap,
    v_settings.special_tier_50_weekly_user_cap,
    v_settings.special_tier_100_weekly_user_cap,
    v_settings.unique_legend_points,
    v_settings.unique_legend_cooldown_days,
    v_settings.cash_redemption_enabled
  from public.rewards r
  where r.created_at >= v_week_start;
end;
$$;

create or replace function public.award_special_tier(
  p_telegram_id bigint,
  p_points integer,
  p_reason text,
  p_awarded_by bigint
)
returns table(outcome text, awarded_points integer, total_points integer, weekly_user_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.reward_budget_settings%rowtype;
  v_user public.users%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_reward_type text;
  v_cap integer;
  v_count integer := 0;
begin
  if p_points not in (20, 50, 100) then
    return query select 'invalid_tier'::text, 0, 0, 0;
    return;
  end if;
  if length(v_reason) < 3 or length(v_reason) > 240 then
    return query select 'invalid_reason'::text, 0, 0, 0;
    return;
  end if;

  select * into v_settings from public.reward_budget_settings where id = 'global' for update;
  select * into v_user from public.users where telegram_id = p_telegram_id for update;
  if not found then
    return query select 'user_not_registered'::text, 0, 0, 0;
    return;
  end if;

  v_reward_type := 'special_' || p_points::text;
  v_cap := case p_points
    when 20 then v_settings.special_tier_20_weekly_user_cap
    when 50 then v_settings.special_tier_50_weekly_user_cap
    else v_settings.special_tier_100_weekly_user_cap
  end;

  select count(*)::integer into v_count
  from public.rewards
  where telegram_id = p_telegram_id
    and reward_type = v_reward_type
    and created_at >= date_trunc('week', now());

  if v_count >= v_cap then
    return query select 'user_tier_cap_reached'::text, 0, coalesce(v_user.points, 0), v_count;
    return;
  end if;

  begin
    update public.users
    set points = coalesce(points, 0) + p_points,
        updated_at = now()
    where telegram_id = p_telegram_id
    returning * into v_user;

    insert into public.rewards(telegram_id, mission_id, points, reward_type, description)
    values (p_telegram_id, null, p_points, v_reward_type, v_reason);

    insert into public.reward_transactions(
      telegram_id, mission_id, submission_id, amount, reward_type, reason, awarded_by
    ) values (
      p_telegram_id, null, null, p_points, v_reward_type, v_reason, p_awarded_by
    );

    insert into public.mission_history(mission_id, action, actor_telegram_id, details)
    values (
      null,
      'special_tier_awarded',
      p_awarded_by,
      jsonb_build_object('telegram_id', p_telegram_id, 'points', p_points, 'reason', v_reason)
    );
  exception
    when others then
      if sqlerrm in (
        'weekly_reward_budget_exhausted',
        'active_reward_budget_exhausted',
        'reward_category_budget_exhausted'
      ) then
        return query select 'budget_exhausted'::text, 0, coalesce(v_user.points, 0), v_count;
        return;
      end if;
      raise;
  end;

  return query select 'awarded'::text, p_points, coalesce(v_user.points, 0), v_count + 1;
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
begin
  return query
  select a.outcome, a.awarded_points, a.total_points
  from public.award_special_tier(p_telegram_id, 50, p_reason, p_awarded_by) a;
end;
$$;

create table if not exists public.shill_boosts (
  id bigint generated by default as identity primary key,
  referral_id bigint not null unique references public.member_referrals(id) on delete restrict,
  inviter_telegram_id bigint not null,
  newcomer_telegram_id bigint not null,
  points_awarded integer not null check (points_awarded > 0),
  requested_at timestamptz not null default now(),
  awarded_at timestamptz not null default now()
);
create index if not exists shill_boosts_inviter_week_idx
  on public.shill_boosts(inviter_telegram_id, awarded_at desc);

create or replace function public.claim_shill_boost(
  p_referral_id bigint,
  p_requester_telegram_id bigint
)
returns table(outcome text, newcomer_telegram_id bigint, awarded_points integer, newcomer_total_points integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral public.member_referrals%rowtype;
  v_settings public.reward_budget_settings%rowtype;
  v_count integer := 0;
  v_total integer := 0;
begin
  select * into v_referral
  from public.member_referrals
  where id = p_referral_id
  for update;

  if not found then return query select 'not_found'::text, null::bigint, 0, 0; return; end if;
  if v_referral.inviter_telegram_id <> p_requester_telegram_id then
    return query select 'not_inviter'::text, v_referral.referred_telegram_id, 0, 0; return;
  end if;
  if v_referral.status <> 'qualified' then
    return query select 'referral_not_qualified'::text, v_referral.referred_telegram_id, 0, 0; return;
  end if;
  if exists (select 1 from public.shill_boosts where referral_id = p_referral_id) then
    return query select 'already_boosted'::text, v_referral.referred_telegram_id, 0, 0; return;
  end if;
  if not exists (
    select 1 from public.rewards r
    where r.telegram_id = v_referral.referred_telegram_id
      and public.reward_category_for_type(r.reward_type) = 'mission'
      and r.created_at >= coalesce(v_referral.qualified_at, v_referral.joined_at)
  ) then
    return query select 'first_mission_required'::text, v_referral.referred_telegram_id, 0, 0; return;
  end if;

  select * into v_settings from public.reward_budget_settings where id = 'global' for update;
  select count(*)::integer into v_count
  from public.shill_boosts
  where inviter_telegram_id = p_requester_telegram_id
    and awarded_at >= date_trunc('week', now());
  if v_count >= v_settings.shill_boost_weekly_inviter_cap then
    return query select 'weekly_boost_cap_reached'::text, v_referral.referred_telegram_id, 0, 0; return;
  end if;

  begin
    update public.users
    set points = coalesce(points, 0) + v_settings.shill_boost_points,
        updated_at = now()
    where telegram_id = v_referral.referred_telegram_id
    returning points into v_total;

    insert into public.rewards(telegram_id, mission_id, points, reward_type, description)
    values (
      v_referral.referred_telegram_id,
      null,
      v_settings.shill_boost_points,
      'shill_boost',
      'New Legend completed their first verified Raaiiidd after referral qualification'
    );

    insert into public.reward_transactions(
      telegram_id, mission_id, submission_id, amount, reward_type, reason, awarded_by
    ) values (
      v_referral.referred_telegram_id,
      null,
      null,
      v_settings.shill_boost_points,
      'shill_boost',
      'New Legend onboarding boost',
      p_requester_telegram_id
    );

    insert into public.shill_boosts(
      referral_id, inviter_telegram_id, newcomer_telegram_id, points_awarded
    ) values (
      v_referral.id,
      v_referral.inviter_telegram_id,
      v_referral.referred_telegram_id,
      v_settings.shill_boost_points
    );
  exception
    when unique_violation then
      return query select 'already_boosted'::text, v_referral.referred_telegram_id, 0, coalesce(v_total, 0); return;
    when others then
      if sqlerrm in (
        'weekly_reward_budget_exhausted',
        'active_reward_budget_exhausted',
        'reward_category_budget_exhausted'
      ) then
        return query select 'budget_exhausted'::text, v_referral.referred_telegram_id, 0, coalesce(v_total, 0); return;
      end if;
      raise;
  end;

  return query select 'awarded'::text, v_referral.referred_telegram_id, v_settings.shill_boost_points, coalesce(v_total, 0);
end;
$$;

create table if not exists public.legend_status_definitions (
  code text primary key,
  title text not null,
  description text not null,
  recognition_type text not null check (recognition_type in ('earned','holding_recognition')),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  minimum_days integer not null default 0 check (minimum_days >= 0),
  minimum_usd numeric(14,2),
  holding_scope text check (holding_scope is null or holding_scope in ('one_official_token','every_official_token')),
  reward_enabled boolean not null default false,
  verification_mode text not null default 'manual_review' check (verification_mode in ('manual_review','planned_compliance_review')),
  status text not null default 'active' check (status in ('active','planned','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.legend_status_definitions(
  code,title,description,recognition_type,points_awarded,minimum_days,minimum_usd,holding_scope,reward_enabled,verification_mode,status
) values
  ('legendary_shiller','Legendary Shiller','Sustained, genuine community growth with retained and active new members.','earned',0,30,null,null,false,'manual_review','active'),
  ('token_supporter','CryptoWorldz Token Supporter','Opt-in recognition for a public wallet holding at least USD $10 equivalent of every active official token for 30 days. No points or payout.','holding_recognition',0,30,10,'every_official_token',false,'planned_compliance_review','planned'),
  ('portfolio_legend','CryptoWorldz Portfolio Legend','Opt-in recognition for a public wallet holding at least USD $100 equivalent of every active official token for 30 days. No points or payout.','holding_recognition',0,30,100,'every_official_token',false,'planned_compliance_review','planned'),
  ('whale_supporter','CryptoWorldz Whale Supporter','Opt-in recognition for a public wallet holding at least USD $500 equivalent of one official token for 30 days. No points or payout.','holding_recognition',0,30,500,'one_official_token',false,'planned_compliance_review','planned'),
  ('oneworldz_gold','OneWorldz Gold Recognition','Opt-in recognition for a public wallet holding at least USD $1,000 equivalent of every active official token for 90 days. No points or payout.','holding_recognition',0,90,1000,'every_official_token',false,'planned_compliance_review','planned'),
  ('unique_legend','Unique Legend','Quarterly owner-reviewed leadership, verified contribution and real community impact award.','earned',250,90,null,null,true,'manual_review','active')
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  recognition_type = excluded.recognition_type,
  points_awarded = excluded.points_awarded,
  minimum_days = excluded.minimum_days,
  minimum_usd = excluded.minimum_usd,
  holding_scope = excluded.holding_scope,
  reward_enabled = excluded.reward_enabled,
  verification_mode = excluded.verification_mode,
  status = excluded.status,
  updated_at = now();

create table if not exists public.legend_status_applications (
  id bigint generated by default as identity primary key,
  telegram_id bigint not null,
  status_code text not null references public.legend_status_definitions(code) on update cascade on delete restrict,
  evidence_note text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  reviewed_by bigint,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists legend_status_pending_unique
  on public.legend_status_applications(telegram_id,status_code)
  where status = 'pending';

create table if not exists public.member_legend_statuses (
  id bigint generated by default as identity primary key,
  telegram_id bigint not null,
  status_code text not null references public.legend_status_definitions(code) on update cascade on delete restrict,
  awarded_points integer not null default 0 check (awarded_points >= 0),
  awarded_by bigint,
  evidence_note text not null default '',
  awarded_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  unique (telegram_id,status_code,awarded_at)
);
create index if not exists member_legend_statuses_profile_idx
  on public.member_legend_statuses(telegram_id,status,awarded_at desc);

create or replace function public.apply_unique_legend(p_telegram_id bigint, p_evidence_note text)
returns table(outcome text, application_id bigint, mission_count integer, referral_count integer, membership_days integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_application_id bigint;
  v_missions integer := 0;
  v_referrals integer := 0;
  v_days integer := 0;
  v_note text := left(trim(coalesce(p_evidence_note,'')), 1000);
begin
  select * into v_user from public.users where telegram_id = p_telegram_id;
  if not found then return query select 'user_not_registered'::text, null::bigint,0,0,0; return; end if;

  v_days := greatest(0, floor(extract(epoch from (now() - coalesce(v_user.created_at, v_user.registered_at::timestamptz))) / 86400)::integer);
  select count(*)::integer into v_missions from public.rewards
    where telegram_id = p_telegram_id and public.reward_category_for_type(reward_type) = 'mission';
  select count(*)::integer into v_referrals from public.member_referrals
    where inviter_telegram_id = p_telegram_id and status = 'qualified';

  if v_days < 30 or v_missions < 10 or v_referrals < 5 then
    return query select 'not_yet_eligible'::text, null::bigint,v_missions,v_referrals,v_days; return;
  end if;
  if exists (select 1 from public.legend_status_applications where telegram_id=p_telegram_id and status_code='unique_legend' and status='pending') then
    return query select 'already_pending'::text,
      (select id from public.legend_status_applications where telegram_id=p_telegram_id and status_code='unique_legend' and status='pending' order by created_at desc limit 1),
      v_missions,v_referrals,v_days; return;
  end if;
  if exists (
    select 1 from public.member_legend_statuses
    where telegram_id=p_telegram_id and status_code='unique_legend' and status='active'
      and awarded_at >= now() - interval '90 days'
  ) then
    return query select 'cooldown_active'::text,null::bigint,v_missions,v_referrals,v_days; return;
  end if;

  insert into public.legend_status_applications(telegram_id,status_code,evidence_note)
  values (p_telegram_id,'unique_legend',v_note)
  returning id into v_application_id;
  return query select 'submitted'::text,v_application_id,v_missions,v_referrals,v_days;
end;
$$;

create or replace function public.review_unique_legend(
  p_application_id bigint,
  p_approve boolean,
  p_reviewed_by bigint,
  p_review_note text
)
returns table(outcome text, telegram_id bigint, awarded_points integer, total_points integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.legend_status_applications%rowtype;
  v_settings public.reward_budget_settings%rowtype;
  v_total integer := 0;
  v_note text := left(trim(coalesce(p_review_note,'')), 1000);
begin
  select * into v_application from public.legend_status_applications where id=p_application_id for update;
  if not found then return query select 'not_found'::text,null::bigint,0,0; return; end if;
  if v_application.status <> 'pending' then return query select 'already_reviewed'::text,v_application.telegram_id,0,0; return; end if;

  if not p_approve then
    update public.legend_status_applications
    set status='rejected',reviewed_by=p_reviewed_by,review_note=v_note,reviewed_at=now(),updated_at=now()
    where id=p_application_id;
    return query select 'rejected'::text,v_application.telegram_id,0,0; return;
  end if;

  select * into v_settings from public.reward_budget_settings where id='global' for update;
  if not v_settings.reserve_enabled then
    return query select 'reserve_locked'::text,v_application.telegram_id,0,0; return;
  end if;

  begin
    update public.users
    set points=coalesce(points,0)+v_settings.unique_legend_points,updated_at=now()
    where telegram_id=v_application.telegram_id
    returning points into v_total;

    insert into public.rewards(telegram_id,mission_id,points,reward_type,description)
    values (v_application.telegram_id,null,v_settings.unique_legend_points,'owner_reserve_unique_legend','Unique Legend leadership and community impact award');

    insert into public.reward_transactions(telegram_id,mission_id,submission_id,amount,reward_type,reason,awarded_by)
    values (v_application.telegram_id,null,null,v_settings.unique_legend_points,'owner_reserve_unique_legend',coalesce(nullif(v_note,''),'Unique Legend approved'),p_reviewed_by);

    insert into public.member_legend_statuses(telegram_id,status_code,awarded_points,awarded_by,evidence_note)
    values (v_application.telegram_id,'unique_legend',v_settings.unique_legend_points,p_reviewed_by,coalesce(nullif(v_note,''),v_application.evidence_note));
  exception when others then
    if sqlerrm in ('reward_reserve_locked','weekly_reward_budget_exhausted','reward_category_budget_exhausted') then
      return query select 'budget_exhausted'::text,v_application.telegram_id,0,coalesce(v_total,0); return;
    end if;
    raise;
  end;

  update public.legend_status_applications
  set status='approved',reviewed_by=p_reviewed_by,review_note=v_note,reviewed_at=now(),updated_at=now()
  where id=p_application_id;

  return query select 'approved'::text,v_application.telegram_id,v_settings.unique_legend_points,coalesce(v_total,0);
end;
$$;

-- Reward wallet: AUD $100 operating target, AUD $200 hard owner-deposit recording ceiling.
alter table public.reward_funding_settings
  drop constraint if exists reward_funding_settings_weekly_target_aud_cents_check,
  drop constraint if exists reward_funding_settings_weekly_target_points_check;
alter table public.reward_funding_settings
  add column if not exists weekly_max_aud_cents integer not null default 20000 check (weekly_max_aud_cents between 0 and 20000),
  add constraint reward_funding_settings_weekly_target_aud_cents_check check (weekly_target_aud_cents between 0 and 20000),
  add constraint reward_funding_settings_weekly_target_points_check check (weekly_target_points between 0 and 5000);
update public.reward_funding_settings
set weekly_target_aud_cents=10000,
    weekly_max_aud_cents=20000,
    weekly_target_points=5000,
    updated_at=now()
where id='global';
update public.reward_funding_schedule set planned_aud_cents=4000,updated_at=now() where day_of_week=1;
update public.reward_funding_schedule set planned_aud_cents=3000,updated_at=now() where day_of_week=2;
update public.reward_funding_schedule set planned_aud_cents=3000,updated_at=now() where day_of_week=4;

drop function if exists public.record_reward_funding_deposit(integer,numeric,text,bigint);
create function public.record_reward_funding_deposit(
  p_aud_value_cents integer,
  p_usdc_amount numeric,
  p_transaction_signature text,
  p_recorded_by bigint
)
returns table(outcome text, deposit_id bigint, weekly_recorded_aud_cents integer, weekly_remaining_aud_cents integer, weekly_max_remaining_aud_cents integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.reward_funding_settings%rowtype;
  v_week_start date:=public.current_reward_week_start();
  v_day smallint:=extract(isodow from now() at time zone 'Australia/Sydney')::smallint;
  v_used integer:=0;
  v_deposit_id bigint;
  v_signature text:=trim(coalesce(p_transaction_signature,''));
begin
  select * into v_settings from public.reward_funding_settings where id='global' for update;
  select coalesce(sum(aud_value_cents),0)::integer into v_used
  from public.reward_funding_deposits
  where reward_week_start=v_week_start and status in ('recorded','verified');

  if p_aud_value_cents is null or p_aud_value_cents<=0 then
    return query select 'invalid_aud_value'::text,null::bigint,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end if;
  if p_usdc_amount is null or p_usdc_amount<=0 then
    return query select 'invalid_usdc_amount'::text,null::bigint,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end if;
  if v_signature !~ '^[1-9A-HJ-NP-Za-km-z]{40,100}$' then
    return query select 'invalid_transaction_signature'::text,null::bigint,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end if;
  if v_used+p_aud_value_cents>v_settings.weekly_max_aud_cents then
    return query select 'weekly_max_exceeded'::text,null::bigint,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end if;

  begin
    insert into public.reward_funding_deposits(
      reward_week_start,recorded_day_of_week,aud_value_cents,asset,asset_amount,transaction_signature,status,recorded_by
    ) values (v_week_start,v_day,p_aud_value_cents,'USDC',p_usdc_amount,v_signature,'recorded',p_recorded_by)
    returning id into v_deposit_id;
  exception when unique_violation then
    return query select 'duplicate_transaction'::text,null::bigint,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end;

  v_used:=v_used+p_aud_value_cents;
  return query select 'recorded'::text,v_deposit_id,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0);
end;
$$;

drop function if exists public.get_reward_funding_status();
create function public.get_reward_funding_status()
returns table(
  reward_week_start date,network text,funding_asset text,default_payout_asset text,allowed_payout_assets text[],
  weekly_target_aud_cents integer,weekly_max_aud_cents integer,weekly_target_points integer,
  recorded_aud_cents integer,remaining_aud_cents integer,max_remaining_aud_cents integer,
  timezone text,sol_conversion_policy text,auto_transfer_enabled boolean,funding_schedule jsonb
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.reward_funding_settings%rowtype;
  v_week date:=public.current_reward_week_start();
  v_used integer:=0;
  v_schedule jsonb:='[]'::jsonb;
begin
  select * into v_settings from public.reward_funding_settings where id='global';
  select coalesce(sum(d.aud_value_cents),0)::integer into v_used from public.reward_funding_deposits d
    where d.reward_week_start=v_week and d.status in ('recorded','verified');
  select coalesce(jsonb_agg(jsonb_build_object('day_of_week',s.day_of_week,'day_label',s.day_label,'planned_aud_cents',s.planned_aud_cents) order by s.display_order),'[]'::jsonb)
    into v_schedule from public.reward_funding_schedule s where s.active=true;
  return query select v_week,v_settings.network,v_settings.funding_asset,v_settings.default_payout_asset,v_settings.allowed_payout_assets,
    v_settings.weekly_target_aud_cents,v_settings.weekly_max_aud_cents,v_settings.weekly_target_points,
    v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0),
    v_settings.timezone,v_settings.sol_conversion_policy,v_settings.auto_transfer_enabled,v_schedule;
end;
$$;

-- Investment and every project wallet: AUD $200 hard weekly recording ceiling.
alter table public.investment_funding_settings
  drop constraint if exists investment_funding_settings_weekly_target_aud_cents_check;
alter table public.investment_funding_settings
  add column if not exists weekly_max_aud_cents integer not null default 20000 check (weekly_max_aud_cents between 0 and 20000),
  add constraint investment_funding_settings_weekly_target_aud_cents_check check (weekly_target_aud_cents between 0 and 20000);
update public.investment_funding_settings
set weekly_target_aud_cents=10000,weekly_max_aud_cents=20000,updated_at=now()
where id='global';

alter table public.project_wallets
  add column if not exists weekly_owner_deposit_cap_aud_cents integer not null default 20000 check (weekly_owner_deposit_cap_aud_cents between 0 and 20000);
update public.project_wallets set weekly_owner_deposit_cap_aud_cents=20000,updated_at=now();

drop function if exists public.record_investment_funding_deposit(integer,numeric,text,bigint);
create function public.record_investment_funding_deposit(
  p_aud_value_cents integer,p_usdc_amount numeric,p_transaction_signature text,p_recorded_by bigint
)
returns table(outcome text,weekly_recorded_aud_cents integer,weekly_remaining_aud_cents integer,weekly_max_remaining_aud_cents integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.investment_funding_settings%rowtype;
  v_week date:=public.current_investment_week_start();
  v_used integer:=0;
begin
  select * into v_settings from public.investment_funding_settings where id='global' for update;
  select coalesce(sum(aud_value_cents),0)::integer into v_used from public.investment_funding_deposits
    where funding_week_start=v_week and status in ('recorded','verified');
  if p_aud_value_cents is null or p_aud_value_cents<=0 or p_usdc_amount is null or p_usdc_amount<=0 then
    return query select 'invalid_amount'::text,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end if;
  if exists(select 1 from public.investment_funding_deposits where transaction_signature=p_transaction_signature) then
    return query select 'duplicate_transaction'::text,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end if;
  if v_used+p_aud_value_cents>v_settings.weekly_max_aud_cents then
    return query select 'weekly_max_exceeded'::text,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0); return;
  end if;
  insert into public.investment_funding_deposits(funding_week_start,aud_value_cents,usdc_amount,transaction_signature,recorded_by)
  values(v_week,p_aud_value_cents,p_usdc_amount,p_transaction_signature,p_recorded_by);
  v_used:=v_used+p_aud_value_cents;
  return query select 'recorded'::text,v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0);
end;
$$;

drop function if exists public.get_investment_funding_status();
create function public.get_investment_funding_status()
returns table(
  funding_week_start date,funding_asset text,weekly_target_aud_cents integer,weekly_max_aud_cents integer,
  recorded_aud_cents integer,remaining_aud_cents integer,max_remaining_aud_cents integer,auto_transfer_enabled boolean
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_settings public.investment_funding_settings%rowtype;
  v_week date:=public.current_investment_week_start();
  v_used integer:=0;
begin
  select * into v_settings from public.investment_funding_settings where id='global';
  select coalesce(sum(d.aud_value_cents),0)::integer into v_used from public.investment_funding_deposits d
    where d.funding_week_start=v_week and d.status in ('recorded','verified');
  return query select v_week,v_settings.funding_asset,v_settings.weekly_target_aud_cents,v_settings.weekly_max_aud_cents,
    v_used,greatest(v_settings.weekly_target_aud_cents-v_used,0),greatest(v_settings.weekly_max_aud_cents-v_used,0),v_settings.auto_transfer_enabled;
end;
$$;

-- Factual owner work evidence. No hours are inferred or fabricated.
create table if not exists public.owner_work_sessions (
  id bigint generated by default as identity primary key,
  owner_telegram_id bigint not null,
  description text not null check (char_length(description) between 3 and 500),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 10080),
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  self_reported boolean not null default false,
  evidence_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists owner_work_one_open_session
  on public.owner_work_sessions(owner_telegram_id)
  where status='open';

create table if not exists public.owner_delivery_evidence (
  id bigint generated by default as identity primary key,
  owner_telegram_id bigint not null,
  occurred_at timestamptz not null default now(),
  category text not null check (category in ('commit','pull_request','workflow','deployment','test','design','administration','expense','other')),
  title text not null check (char_length(title) between 3 and 240),
  repository text,
  commit_sha text,
  workflow_run_id bigint,
  result text not null default 'recorded' check (result in ('recorded','success','failure','partial')),
  evidence_reference text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists owner_delivery_evidence_time_idx on public.owner_delivery_evidence(occurred_at desc);

alter table public.shill_boosts enable row level security;
alter table public.legend_status_definitions enable row level security;
alter table public.legend_status_applications enable row level security;
alter table public.member_legend_statuses enable row level security;
alter table public.owner_work_sessions enable row level security;
alter table public.owner_delivery_evidence enable row level security;

revoke all on table public.shill_boosts from anon,authenticated;
revoke all on table public.legend_status_definitions from anon,authenticated;
revoke all on table public.legend_status_applications from anon,authenticated;
revoke all on table public.member_legend_statuses from anon,authenticated;
revoke all on table public.owner_work_sessions from anon,authenticated;
revoke all on table public.owner_delivery_evidence from anon,authenticated;

revoke all on function public.award_special_tier(bigint,integer,text,bigint) from public;
revoke all on function public.claim_shill_boost(bigint,bigint) from public;
revoke all on function public.apply_unique_legend(bigint,text) from public;
revoke all on function public.review_unique_legend(bigint,boolean,bigint,text) from public;
grant execute on function public.get_reward_budget_status() to service_role;
grant execute on function public.award_special_tier(bigint,integer,text,bigint) to service_role;
grant execute on function public.award_special_offer(bigint,text,bigint) to service_role;
grant execute on function public.claim_shill_boost(bigint,bigint) to service_role;
grant execute on function public.apply_unique_legend(bigint,text) to service_role;
grant execute on function public.review_unique_legend(bigint,boolean,bigint,text) to service_role;
grant execute on function public.record_reward_funding_deposit(integer,numeric,text,bigint) to service_role;
grant execute on function public.get_reward_funding_status() to service_role;
grant execute on function public.record_investment_funding_deposit(integer,numeric,text,bigint) to service_role;
grant execute on function public.get_investment_funding_status() to service_role;
