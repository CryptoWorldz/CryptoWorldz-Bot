-- Keep the hourly vote guard privileged when fired as a trigger, but remove direct RPC execution.
revoke all on function public.worldz_popularity_vote_hourly_guard() from public;
revoke execute on function public.worldz_popularity_vote_hourly_guard() from anon;
revoke execute on function public.worldz_popularity_vote_hourly_guard() from authenticated;
grant execute on function public.worldz_popularity_vote_hourly_guard() to service_role;
