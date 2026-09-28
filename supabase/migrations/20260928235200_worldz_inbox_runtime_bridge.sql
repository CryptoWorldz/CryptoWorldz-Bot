-- Worldz Inbox™ protected ZED runtime bridge.
-- The protected server may use the service role or the publishable-key fallback.
-- Publishable-key fallback access is granted only when zed_runtime_authorized()
-- validates the server-only x-zed-runtime-key. Ordinary anonymous access remains denied.

drop policy if exists "zed_runtime_bridge" on public.worldz_dm_preferences;
create policy "zed_runtime_bridge" on public.worldz_dm_preferences
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

drop policy if exists "zed_runtime_bridge" on public.worldz_dm_messages;
create policy "zed_runtime_bridge" on public.worldz_dm_messages
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

drop policy if exists "zed_runtime_bridge" on public.worldz_dm_blocks;
create policy "zed_runtime_bridge" on public.worldz_dm_blocks
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

grant select, insert, update, delete on
  public.worldz_dm_preferences,
  public.worldz_dm_messages,
  public.worldz_dm_blocks
to service_role;

grant usage, select on sequence public.worldz_dm_messages_id_seq to service_role;

grant select, insert, update, delete on
  public.worldz_dm_preferences,
  public.worldz_dm_messages,
  public.worldz_dm_blocks
to anon;

grant usage, select on sequence public.worldz_dm_messages_id_seq to anon;

revoke all on
  public.worldz_dm_preferences,
  public.worldz_dm_messages,
  public.worldz_dm_blocks
from authenticated;
