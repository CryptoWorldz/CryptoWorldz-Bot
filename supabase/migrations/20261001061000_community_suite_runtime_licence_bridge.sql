-- Worldz FullBuild Community Suite runtime licence bridge hardening.
-- Allows only the protected ZED runtime header through anon; public callers remain denied by RLS.

create index if not exists community_suite_network_members_chat_id_idx
  on public.community_suite_network_members(chat_id);

drop policy if exists "zed_runtime_bridge" on public.zed_group_licences;
create policy "zed_runtime_bridge" on public.zed_group_licences
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

drop policy if exists "zed_runtime_bridge" on public.zed_group_licence_receipts;
create policy "zed_runtime_bridge" on public.zed_group_licence_receipts
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

grant select, insert, update on public.zed_group_licences to anon;
grant select, insert, update on public.zed_group_licence_receipts to anon;
grant usage, select on sequence public.zed_group_licence_receipts_id_seq to anon;

revoke all on public.zed_group_licences, public.zed_group_licence_receipts from authenticated;
