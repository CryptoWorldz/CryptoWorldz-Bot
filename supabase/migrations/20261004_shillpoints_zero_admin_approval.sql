-- ShillPoints ZERO-ADMIN approval model.
-- Routine valid public proofs are auto-awarded.
-- Invalid/capped proofs are auto-rejected by rules.
-- Temporary automation/budget issues become deferred_auto and retry automatically.

alter table public.social_shill_submissions
  drop constraint if exists social_shill_submissions_status_check;

alter table public.social_shill_submissions
  add constraint social_shill_submissions_status_check
  check (status in ('pending','approved','rejected','deferred_auto'));

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
  v_result record;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not public.zed_runtime_authorized() then
    raise exception 'not_authorized';
  end if;

  select * into v_submission
  from public.social_shill_submissions s
  where s.id=p_submission_id
  for update;

  if not found then
    return query select 'not_found'::text,p_submission_id,null::bigint,null::text,0,0,'submission_not_found'::text;
    return;
  end if;

  select * into v_user
  from public.users u
  where u.telegram_id=v_submission.telegram_id;

  if not found then
    update public.social_shill_submissions s
    set status='rejected',rejection_reason='registration_required',reviewed_by=null,reviewed_at=now(),updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,0,'registration_required'::text;
    return;
  end if;

  if v_submission.status='approved' then
    return query select 'already_awarded'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,
      coalesce(v_submission.points_awarded,0),coalesce(v_user.points,0),null::text;
    return;
  end if;

  if v_submission.status='rejected' then
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,
      0,coalesce(v_user.points,0),coalesce(v_submission.rejection_reason,'already_rejected');
    return;
  end if;

  if v_submission.status not in ('pending','deferred_auto') then
    update public.social_shill_submissions s
    set status='deferred_auto',rejection_reason='automation_retry_invalid_state',reviewed_by=null,reviewed_at=null,updated_at=now()
    where s.id=v_submission.id;
    return query select 'deferred_auto'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'automation_retry_invalid_state'::text;
    return;
  end if;

  select * into v_settings
  from public.activity_reward_automation_settings
  where id='global';

  if not found or v_settings is null or not coalesce(v_settings.enabled,false) or not coalesce(v_settings.auto_shill_points,false) then
    update public.social_shill_submissions s
    set status='deferred_auto',rejection_reason='automation_temporarily_unavailable',reviewed_by=null,reviewed_at=null,updated_at=now()
    where s.id=v_submission.id;
    return query select 'deferred_auto'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'automation_temporarily_unavailable'::text;
    return;
  end if;

  if v_submission.proof_url !~* '^https://[^[:space:]]+$' then
    update public.social_shill_submissions s
    set status='rejected',rejection_reason='invalid_public_proof',reviewed_by=null,reviewed_at=now(),updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'invalid_public_proof'::text;
    return;
  end if;

  select * into v_token
  from public.shill_reward_tokens t
  where t.symbol=v_submission.token_symbol and t.enabled=true;

  if not found then
    update public.social_shill_submissions s
    set status='rejected',rejection_reason='token_disabled',reviewed_by=null,reviewed_at=now(),updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'token_disabled'::text;
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
    update public.social_shill_submissions s
    set status='rejected',rejection_reason='shill_daily_cap',reviewed_by=null,reviewed_at=now(),updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'shill_daily_cap'::text;
    return;
  end if;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_day_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_day_start and r.points>0;

  select coalesce(sum(greatest(r.points,0)),0)::integer into v_week_points
  from public.rewards r
  where r.telegram_id=v_submission.telegram_id and r.created_at>=v_week_start and r.points>0;

  if v_day_points + v_token.points_per_verified_share > v_settings.user_daily_points_cap then
    update public.social_shill_submissions s
    set status='rejected',rejection_reason='daily_points_cap',reviewed_by=null,reviewed_at=now(),updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'daily_points_cap'::text;
    return;
  end if;

  if v_week_points + v_token.points_per_verified_share > v_settings.user_weekly_points_cap then
    update public.social_shill_submissions s
    set status='rejected',rejection_reason='weekly_points_cap',reviewed_by=null,reviewed_at=now(),updated_at=now()
    where s.id=v_submission.id;
    return query select 'auto_rejected'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'weekly_points_cap'::text;
    return;
  end if;

  if v_submission.status='deferred_auto' then
    update public.social_shill_submissions s
    set status='pending',rejection_reason=null,updated_at=now()
    where s.id=v_submission.id;
  end if;

  select * into v_result
  from public.approve_social_shill_submission(v_submission.id,null)
  limit 1;

  if v_result.outcome='approved' then
    select * into v_user from public.users u where u.telegram_id=v_submission.telegram_id;
    return query select 'awarded'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,
      coalesce(v_result.points_awarded,0),coalesce(v_user.points,0),null::text;
    return;
  end if;

  if v_result.outcome='budget_deferred' then
    update public.social_shill_submissions s
    set status='deferred_auto',rejection_reason='weekly_pool_full',reviewed_by=null,reviewed_at=null,updated_at=now()
    where s.id=v_submission.id;
    return query select 'budget_deferred'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),'weekly_pool_full'::text;
    return;
  end if;

  update public.social_shill_submissions s
  set status='deferred_auto',rejection_reason=coalesce(v_result.outcome,'automation_retry'),reviewed_by=null,reviewed_at=null,updated_at=now()
  where s.id=v_submission.id;

  return query select 'deferred_auto'::text,v_submission.id,v_submission.telegram_id,v_submission.token_symbol,0,coalesce(v_user.points,0),coalesce(v_result.outcome,'automation_retry');
end;
$$;

revoke all on function public.auto_award_social_shill_submission(bigint)
  from public,authenticated;
grant execute on function public.auto_award_social_shill_submission(bigint)
  to anon,service_role;

create or replace function public.auto_process_new_shill_submission()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform * from public.auto_award_social_shill_submission(new.id);
  return new;
end;
$$;

drop trigger if exists social_shill_submission_auto_award_after
  on public.social_shill_submissions;

create trigger social_shill_submission_auto_award_after
after insert on public.social_shill_submissions
for each row
execute function public.auto_process_new_shill_submission();

create or replace function public.reconcile_pending_shill_rewards(p_limit integer default 50)
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
    select ss.id
    from public.social_shill_submissions ss
    where ss.status in ('pending','deferred_auto')
    order by ss.created_at asc,ss.id asc
    limit greatest(1,least(coalesce(p_limit,50),250))
  loop
    v_processed:=v_processed+1;
    select * into v_result
    from public.auto_award_social_shill_submission(v_row.id)
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

revoke all on function public.reconcile_pending_shill_rewards(integer)
  from public,authenticated;
grant execute on function public.reconcile_pending_shill_rewards(integer)
  to anon,service_role;

do $$
declare v_row record;
begin
  for v_row in
    select id from public.social_shill_submissions
    where status='pending'
    order by created_at asc,id asc
  loop
    perform * from public.auto_award_social_shill_submission(v_row.id);
  end loop;
end;
$$;
