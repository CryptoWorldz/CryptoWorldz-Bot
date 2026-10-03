-- Worldz Squads™ RLS performance cleanup.
-- Evaluate role/runtime authorization once per statement instead of once per row.

drop policy if exists worldz_squads_runtime on public.worldz_squads;
create policy worldz_squads_runtime on public.worldz_squads
  for all
  using (coalesce((select auth.role()),'') = 'service_role' or (select public.zed_runtime_authorized()))
  with check (coalesce((select auth.role()),'') = 'service_role' or (select public.zed_runtime_authorized()));

drop policy if exists worldz_squad_members_runtime on public.worldz_squad_members;
create policy worldz_squad_members_runtime on public.worldz_squad_members
  for all
  using (coalesce((select auth.role()),'') = 'service_role' or (select public.zed_runtime_authorized()))
  with check (coalesce((select auth.role()),'') = 'service_role' or (select public.zed_runtime_authorized()));

drop policy if exists worldz_squad_performance_runtime_read on public.worldz_squad_performance;
create policy worldz_squad_performance_runtime_read on public.worldz_squad_performance
  for select
  using (coalesce((select auth.role()),'') = 'service_role' or (select public.zed_runtime_authorized()));
