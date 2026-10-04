-- Worldz Votes + ShillPoints targeted performance/security hardening.
-- Keep the public leaderboard behind underlying RLS/runtime bridge instead of view-owner privileges.

alter view public.worldz_popularity_leaderboard
  set (security_invoker = true);

create index if not exists worldz_popularity_votes_token_created_idx
  on public.worldz_popularity_votes(token_id, created_at desc);

create index if not exists social_shill_submissions_token_symbol_idx
  on public.social_shill_submissions(token_symbol);
