-- Worldz Votes + ShillPoints targeted performance/security hardening.
-- Keep the public leaderboard behind underlying RLS/runtime bridge instead of view-owner privileges.

alter view public.worldz_popularity_leaderboard
  set (security_invoker = true);

create index if not exists worldz_popularity_votes_token_created_idx
  on public.worldz_popularity_votes(token_id, created_at desc);

create index if not exists social_shill_submissions_token_symbol_idx
  on public.social_shill_submissions(token_symbol);

-- Raaiiidd Creator: routine safe submissions are bot-validated.
-- Legacy pending rows become either creator-action-required or automatic retry holds.
alter table public.raaiiidd_creator_requests
  drop constraint if exists raaiiidd_creator_requests_status_check;

alter table public.raaiiidd_creator_requests
  add constraint raaiiidd_creator_requests_status_check
  check (status in ('pending','awaiting_url','deferred_auto','approved','rejected'));

update public.raaiiidd_creator_requests
set status='awaiting_url',
    review_note=coalesce(review_note,'awaiting_creator_published_https_url'),
    updated_at=now()
where status='pending' and coalesce(target_url,'')='';

update public.raaiiidd_creator_requests
set status='deferred_auto',
    review_note=coalesce(review_note,'legacy_creator_request_queued_for_automatic_recheck'),
    updated_at=now()
where status='pending' and coalesce(target_url,'')<>'';
