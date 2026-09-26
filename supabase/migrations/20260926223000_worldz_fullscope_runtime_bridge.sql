-- WorldzFullScope™ protected ZED runtime bridge.
-- The server's publishable-key fallback sends x-zed-runtime-key; RLS verifies it
-- through zed_runtime_authorized(). Ordinary anonymous requests remain denied.

create policy "zed_runtime_bridge" on public.worldz_fullscope_chains
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_fullscope_tokens
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_popularity_votes
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_popularity_sponsored_boosts
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_fullscope_events
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_fullscope_action_intents
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_fullscope_locks
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_fullscope_vesting
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

grant select, insert, update, delete on
  public.worldz_fullscope_chains,
  public.worldz_fullscope_tokens,
  public.worldz_popularity_votes,
  public.worldz_popularity_sponsored_boosts,
  public.worldz_fullscope_events,
  public.worldz_fullscope_action_intents,
  public.worldz_fullscope_locks,
  public.worldz_fullscope_vesting
to anon;

grant select on public.worldz_popularity_leaderboard to anon;
grant usage, select on sequence public.worldz_popularity_votes_id_seq to anon;
