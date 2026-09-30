-- Security-linter cleanup for the 30 Sep ZED update.
-- partner_allocation_candidates is intentionally server-only; add an explicit deny
-- policy for public roles, and pin the helper function search_path.

create or replace function public.reward_category_for_type(p_reward_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_reward_type, '') like 'referral_%' then 'referral'
    when coalesce(p_reward_type, '') in ('mission_points', 'mission')
      or coalesce(p_reward_type, '') like 'shill_%' then 'mission'
    else 'reserve'
  end
$$;

drop policy if exists "worldz_server_only_partner_allocation_candidates"
  on public.partner_allocation_candidates;
create policy "worldz_server_only_partner_allocation_candidates"
on public.partner_allocation_candidates
for all
to anon, authenticated
using (false)
with check (false);
