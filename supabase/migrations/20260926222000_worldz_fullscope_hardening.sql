-- WorldzFullScope™ production hardening
-- Keep FullScope server-side only and remove direct RPC execution of the trigger helper.
revoke execute on function public.worldz_fullscope_enforce_token_capacity() from public, anon, authenticated;
grant execute on function public.worldz_fullscope_enforce_token_capacity() to service_role;

-- Cover FullScope foreign keys used by event/action/lock/vesting workloads.
create index if not exists worldz_popularity_sponsored_boosts_token_idx
  on public.worldz_popularity_sponsored_boosts(token_id);

create index if not exists worldz_fullscope_action_intents_token_idx
  on public.worldz_fullscope_action_intents(token_id);
create index if not exists worldz_fullscope_action_intents_chain_idx
  on public.worldz_fullscope_action_intents(chain_key);

create index if not exists worldz_fullscope_locks_token_idx
  on public.worldz_fullscope_locks(token_id);
create index if not exists worldz_fullscope_locks_chain_idx
  on public.worldz_fullscope_locks(chain_key);

create index if not exists worldz_fullscope_vesting_token_idx
  on public.worldz_fullscope_vesting(token_id);
create index if not exists worldz_fullscope_vesting_chain_idx
  on public.worldz_fullscope_vesting(chain_key);

comment on function public.worldz_fullscope_enforce_token_capacity() is
'Internal WorldzFullScope trigger helper. Direct anon/authenticated RPC execution is revoked; service-role runtime only.';
