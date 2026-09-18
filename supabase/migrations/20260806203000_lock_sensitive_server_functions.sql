revoke all on function public.enforce_standard_mission_reward() from public, anon, authenticated;
revoke all on function public.enforce_weekly_reward_budget() from public, anon, authenticated;
revoke all on function public.get_investment_funding_status() from public, anon, authenticated;
revoke all on function public.get_reward_budget_status() from public, anon, authenticated;
revoke all on function public.get_reward_funding_status() from public, anon, authenticated;
revoke all on function public.record_investment_funding_deposit(integer, numeric, text, bigint) from public, anon, authenticated;
revoke all on function public.record_reward_funding_deposit(integer, numeric, text, bigint) from public, anon, authenticated;

grant execute on function public.enforce_standard_mission_reward() to service_role;
grant execute on function public.enforce_weekly_reward_budget() to service_role;
grant execute on function public.get_investment_funding_status() to service_role;
grant execute on function public.get_reward_budget_status() to service_role;
grant execute on function public.get_reward_funding_status() to service_role;
grant execute on function public.record_investment_funding_deposit(integer, numeric, text, bigint) to service_role;
grant execute on function public.record_reward_funding_deposit(integer, numeric, text, bigint) to service_role;

alter function public.reward_category_for_type(text) set search_path = public, pg_temp;
alter function public.current_investment_week_start() set search_path = public, pg_temp;
