-- Worldz Raaiiidd Creator — automation-first lifecycle.
-- Routine safe creator Raids are bot-validated and activated without an Admin approval queue.
-- Incomplete destinations wait for the creator; technical/moderation outages retry automatically.

alter table public.raaiiidd_creator_requests
  drop constraint if exists raaiiidd_creator_requests_status_check;

alter table public.raaiiidd_creator_requests
  add constraint raaiiidd_creator_requests_status_check
  check (status in ('pending','awaiting_target','deferred_auto','approved','rejected'));

update public.raaiiidd_creator_requests
set status='deferred_auto',
    review_note=coalesce(review_note,'automatic_validation_migration'),
    updated_at=now()
where status='pending';

create index if not exists raaiiidd_creator_requests_auto_retry_idx
  on public.raaiiidd_creator_requests(status, updated_at)
  where status in ('pending','deferred_auto');

create index if not exists raaiiidd_creator_requests_target_idx
  on public.raaiiidd_creator_requests(target_url)
  where target_url is not null;
