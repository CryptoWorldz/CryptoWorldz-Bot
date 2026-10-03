-- Ronald Raider ZERO-ADMIN approval model.
-- Normal Raid claims are processed automatically inside the database.
-- No ordinary successful Raid waits for Admin approval.
-- Temporary infrastructure/budget issues become deferred_auto and are retried automatically.

alter table public.mission_submissions
  drop constraint if exists mission_submissions_status_check;

alter table public.mission_submissions
  add constraint mission_submissions_status_check
  check (status in ('pending','approved','rejected','deferred_auto'));

create or replace function public.auto_award_raid_submission_core(p_submission_id bigint)
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
  v_error text;
begin
  select * into v_settings
  from public.activity_reward_automation_settings
  where id='global';

  select * into v_submission
  from public.mission_submissions s
  where s.id=p_submission_id
  for update;

  if not found then
    return query select 'not_found'::text,p_submission_id,null::bigint,0,0,'submission_not_found'::text;
    return;
  end if;

  select * into v_user
  from public.users u
  where u.telegram_id=v_submission.telegram_id
  for update;

  if not found then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='registration_required',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,0,'registration_required'::text;
    return;
  end if;

  if v_submission.status='approved' then
    return query select 'already_awarded'::text,v_submission.id,v_submission.telegram_id,
      coalesce(v_submission.points_awarded,0),coalesce(v_user.points,0),null::text;
    return;
  end if;

  if v_submission.status='rejected' then
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),
      coalesce(v_submission.rejection_reason,'already_rejected');
    return;
  end if;

  if v_submission.status not in ('pending','deferred_auto') then
    update public.mission_submissions s
    set status='deferred_auto',
        rejection_reason='automation_retry_invalid_state',
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'deferred_auto'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'automation_retry_invalid_state'::text;
    return;
  end if;

  if not found or v_settings is null or not coalesce(v_settings.enabled,false) or not coalesce(v_settings.auto_raid_points,false) then
    update public.mission_submissions s
    set status='deferred_auto',
        rejection_reason='automation_temporarily_unavailable',
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'deferred_auto'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'automation_temporarily_unavailable'::text;
    return;
  end if;

  select * into v_mission
  from public.missions m
  where m.id=v_submission.mission_id;

  if not found then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='mission_not_found',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'mission_not_found'::text;
    return;
  end if;

  -- Eligibility is locked to the member's submission timestamp, not the time
  -- an automated retry happens later.
  if v_mission.starts_at is not null and v_submission.submitted_at < v_mission.starts_at then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='raid_not_started_at_submission',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_not_started_at_submission'::text;
    return;
  end if;

  if v_mission.expires_at is not null and v_submission.submitted_at > v_mission.expires_at then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='raid_expired_at_submission',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_expired_at_submission'::text;
    return;
  end if;

  if v_mission.status not in ('active','open','completed') then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='raid_not_eligible',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_not_eligible'::text;
    return;
  end if;

  v_day_start := (date_trunc('day', now() at time zone v_settings.timezone) at time zone v_settings.timezone);
  v_week_start := (date_trunc('week', now() at time zone v_settings.timezone) at time zone v_settings.timezone);

  select count(*)::integer into v_count
  from public.mission_submissions ms
  where ms.telegram_id=v_submission.telegram_id
    and ms.status='approved'
    and ms.id<>v_submission.id
    and coalesce(ms.reviewed_at,ms.updated_at,ms.submitted_at)>=v_day_start;

  if v_count>=v_settings.raid_daily_claim_cap then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='raid_daily_cap',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'raid_daily_cap'::text;
    return;
  end if;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_day_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_day_start and r.points>0;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_week_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_week_start and r.points>0;

  if v_day_points + greatest(coalesce(v_mission.reward_points,0),0) > v_settings.user_daily_points_cap then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='daily_points_cap',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'daily_points_cap'::text;
    return;
  end if;

  if v_week_points + greatest(coalesce(v_mission.reward_points,0),0) > v_settings.user_weekly_points_cap then
    update public.mission_submissions s
    set status='rejected',
        rejection_reason='weekly_points_cap',
        reviewed_at=now(),
        reviewer_telegram_id=null,
        updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,0,coalesce(v_user.points,0),'weekly_points_cap'::text;
    return;
  end if;

  begin
    update public.users u
    set points=coalesce(u.points,0)+greatest(coalesce(v_mission.reward_points,0),0),
        raids=coalesce(u.raids,0)+1,
        raids_completed=coalesce(u.raids_completed,0)+1,
        updated_at=now()
    where u.telegram_id=v_submission.telegram_id
    returning u.* into v_user;

    insert into public.rewards(
      telegram_id,mission_id,points,reward_type,description
    ) values (
      v_submission.telegram_id,
      v_submission.mission_id,
      greatest(coalesce(v_mission.reward_points,0),0),
      'raid_auto_points',
      'Ronald Raider automatic Raid completion'
    );

    update public.mission_submissions s
    set status='approved',
        points_awarded=greatest(coalesce(v_mission.reward_points,0),0),
        reviewer_telegram_id=null,
        reviewed_at=now(),
        rejection_reason=null,
        updated_at=now()
    where s.id=v_submission.id;

    insert into public.mission_history(
      mission_id,action,actor_telegram_id,details
    ) values (
      v_submission.mission_id,
      'claim_auto_awarded',
      null,
      jsonb_build_object(
        'submission_id',v_submission.id,
        'telegram_id',v_submission.telegram_id,
        'points',greatest(coalesce(v_mission.reward_points,0),0),
        'automation','RONALD_RAIDER_ZERO_ADMIN_V1'
      )
    );
  exception
    when others then
      v_error:=sqlerrm;
      update public.mission_submissions s
      set status='deferred_auto',
          reviewer_telegram_id=null,
          reviewed_at=null,
          rejection_reason=case
            when v_error in ('weekly_reward_budget_exhausted','reward_category_budget_exhausted')
              then 'weekly_pool_full'
            else 'automation_retry'
          end,
          updated_at=now()
      where s.id=v_submission.id;

      return query select
        case when v_error in ('weekly_reward_budget_exhausted','reward_category_budget_exhausted')
          then 'budget_deferred'::text else 'deferred_auto'::text end,
        v_submission.id,
        v_submission.telegram_id,
        0,
        coalesce(v_user.points,0),
        case when v_error in ('weekly_reward_budget_exhausted','reward_category_budget_exhausted')
          then 'weekly_pool_full'::text else 'automation_retry'::text end;
      return;
  end;

  return query select
    'awarded'::text,
    v_submission.id,
    v_submission.telegram_id,
    greatest(coalesce(v_mission.reward_points,0),0),
    coalesce(v_user.points,0),
    null::text;
end;
$$;

revoke all on function public.auto_award_raid_submission_core(bigint)
  from public,anon,authenticated;
grant execute on function public.auto_award_raid_submission_core(bigint)
  to service_role;

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
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.zed_runtime_authorized() then
    raise exception 'not_authorized';
  end if;
  return query
  select * from public.auto_award_raid_submission_core(p_submission_id);
end;
$$;

revoke all on function public.auto_award_raid_submission(bigint)
  from public,authenticated;
grant execute on function public.auto_award_raid_submission(bigint)
  to anon,service_role;

create or replace function public.auto_process_new_raid_submission()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if exists(
    select 1
    from public.raid_campaigns rc
    where rc.mission_id=new.mission_id
  ) then
    perform *
    from public.auto_award_raid_submission_core(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists mission_submission_auto_raid_award_after
  on public.mission_submissions;

create trigger mission_submission_auto_raid_award_after
after insert on public.mission_submissions
for each row
execute function public.auto_process_new_raid_submission();

create or replace function public.reconcile_pending_raid_rewards(p_limit integer default 50)
returns table(processed integer, awarded integer, held integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_processed integer:=0;
  v_awarded integer:=0;
  v_held integer:=0;
  v_row record;
  v_result record;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.zed_runtime_authorized() then
    raise exception 'not_authorized';
  end if;

  for v_row in
    select ms.id
    from public.mission_submissions ms
    where ms.status in ('pending','deferred_auto')
      and exists(
        select 1
        from public.raid_campaigns rc
        where rc.mission_id=ms.mission_id
      )
    order by ms.submitted_at asc,ms.id asc
    limit greatest(1,least(coalesce(p_limit,50),250))
  loop
    v_processed:=v_processed+1;
    select * into v_result
    from public.auto_award_raid_submission_core(v_row.id)
    limit 1;

    if v_result.outcome in ('awarded','already_awarded') then
      v_awarded:=v_awarded+1;
    else
      v_held:=v_held+1;
    end if;
  end loop;

  return query select v_processed,v_awarded,v_held;
end;
$$;

revoke all on function public.reconcile_pending_raid_rewards(integer)
  from public,authenticated;
grant execute on function public.reconcile_pending_raid_rewards(integer)
  to anon,service_role;

-- Clear old Ronald Raider pending rows immediately through the same automated
-- rules. This is not an Admin approval and does not bypass caps or budgets.
do $$
declare
  v_row record;
begin
  for v_row in
    select ms.id
    from public.mission_submissions ms
    where ms.status='pending'
      and exists(
        select 1
        from public.raid_campaigns rc
        where rc.mission_id=ms.mission_id
      )
    order by ms.submitted_at asc,ms.id asc
  loop
    perform *
    from public.auto_award_raid_submission_core(v_row.id);
  end loop;
end;
$$;
