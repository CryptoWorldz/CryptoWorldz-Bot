-- Worldz Squads™ policy/index cleanup after production advisor review.

-- service_role bypasses RLS; the explicit FOR ALL policy created an unnecessary
-- second permissive SELECT policy. Keep runtime SELECT fail-closed and rely on
-- service_role bypass + grants for trusted performance writes.
drop policy if exists worldz_squad_performance_service_write on public.worldz_squad_performance;

create index if not exists worldz_squads_owner_telegram_idx
  on public.worldz_squads(owner_telegram_id);

create index if not exists worldz_squad_members_telegram_idx
  on public.worldz_squad_members(telegram_id);

create index if not exists worldz_squad_performance_telegram_idx
  on public.worldz_squad_performance(telegram_id);
