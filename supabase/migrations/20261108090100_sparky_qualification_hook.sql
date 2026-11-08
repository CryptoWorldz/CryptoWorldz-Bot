-- Automatically mirror newly qualified Worldz HQ referrals into the SPARKY planning ledger.
-- Disabled by default through sparky_referral_campaigns.enabled=false.
create or replace function public.sparky_on_referral_qualified()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare v_result text;
begin
  if new.status='qualified' and old.status is distinct from 'qualified' then
    v_result := public.record_sparky_referral(new.id);
    -- A SPARKY planning failure must never reverse existing Legend Points qualification.
    if v_result not in ('recorded_pending_launch','campaign_disabled','wrong_chat','already_recorded','legend_cap_reached') then
      raise warning 'SPARKY referral planning skipped: %',v_result;
    end if;
  end if;
  return new;
exception when others then
  raise warning 'SPARKY referral planning failed; core referral preserved: %',SQLSTATE;
  return new;
end $$;
drop trigger if exists sparky_referral_qualified_trigger on public.member_referrals;
create trigger sparky_referral_qualified_trigger
after update of status on public.member_referrals
for each row execute function public.sparky_on_referral_qualified();
revoke all on function public.sparky_on_referral_qualified() from public,anon,authenticated;
