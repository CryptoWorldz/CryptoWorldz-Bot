-- Fix PL/pgSQL output-variable ambiguity in Ronald Raider auto-award.
-- RETURNS TABLE declares telegram_id as an implicit PL/pgSQL variable, so the
-- users lookup must qualify the real table column.

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

  select * into v_settings
  from public.activity_reward_automation_settings
  where id='global';

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

  select * into v_user
  from public.users u
  where u.telegram_id=v_submission.telegram_id;

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

  select * into v_mission
  from public.missions
  where id=v_submission.mission_id;

  if not found then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'mission_not_found'::text;
    return;
  end if;

  if v_mission.starts_at is not null and v_submission.submitted_at < v_mission.starts_at then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_not_started'::text;
    return;
  end if;

  if v_mission.expires_at is not null and v_submission.submitted_at > v_mission.expires_at then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_expired_at_submission'::text;
    return;
  end if;

  if v_mission.status not in ('active','open','completed') then
    return query select 'review_required'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_not_eligible'::text;
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
  where r.telegram_id=v_submission.telegram_id
    and r.created_at>=v_day_start
    and r.points>0;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_week_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id
    and r.created_at>=v_week_start
    and r.points>0;

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
