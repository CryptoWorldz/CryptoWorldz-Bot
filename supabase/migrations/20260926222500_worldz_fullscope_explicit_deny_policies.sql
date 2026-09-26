-- WorldzFullScope™ explicit public deny policies.
-- service_role bypasses RLS; anon/authenticated are intentionally denied.
create policy "worldz_server_only_worldz_fullscope_chains" on public.worldz_fullscope_chains
for all to anon, authenticated using (false) with check (false);

create policy "worldz_server_only_worldz_fullscope_tokens" on public.worldz_fullscope_tokens
for all to anon, authenticated using (false) with check (false);

create policy "worldz_server_only_worldz_popularity_votes" on public.worldz_popularity_votes
for all to anon, authenticated using (false) with check (false);

create policy "worldz_server_only_worldz_popularity_sponsored_boosts" on public.worldz_popularity_sponsored_boosts
for all to anon, authenticated using (false) with check (false);

create policy "worldz_server_only_worldz_fullscope_events" on public.worldz_fullscope_events
for all to anon, authenticated using (false) with check (false);

create policy "worldz_server_only_worldz_fullscope_action_intents" on public.worldz_fullscope_action_intents
for all to anon, authenticated using (false) with check (false);

create policy "worldz_server_only_worldz_fullscope_locks" on public.worldz_fullscope_locks
for all to anon, authenticated using (false) with check (false);

create policy "worldz_server_only_worldz_fullscope_vesting" on public.worldz_fullscope_vesting
for all to anon, authenticated using (false) with check (false);
