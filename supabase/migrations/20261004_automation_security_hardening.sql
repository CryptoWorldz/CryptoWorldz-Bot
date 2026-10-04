-- Remove retired direct human reward-approval RPC access.
-- Automatic Raid/Shill engines remain available only through their runtime-authorized wrappers.
-- Preserve service_role maintenance capability.

revoke all on function public.approve_social_shill_submission(bigint,bigint)
  from public,anon,authenticated;
grant execute on function public.approve_social_shill_submission(bigint,bigint)
  to service_role;

revoke all on function public.approve_mission_completion(bigint,bigint)
  from public,anon,authenticated;
grant execute on function public.approve_mission_completion(bigint,bigint)
  to service_role;

revoke all on function public.auto_process_new_shill_submission()
  from public,anon,authenticated;
grant execute on function public.auto_process_new_shill_submission()
  to service_role;

alter function public.reward_category_for_type(text)
  set search_path = '';
