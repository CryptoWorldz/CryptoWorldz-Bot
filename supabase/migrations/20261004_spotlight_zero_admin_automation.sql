-- Worldz Spotlight — automation-first advertising lifecycle.
-- Routine content/payment checks are bot/provider validated; no normal Admin approval queue.

alter table public.worldz_launchpad_ads
  add column if not exists quote_fx_rate numeric(18,9),
  add column if not exists quote_source text,
  add column if not exists quote_expires_at timestamptz,
  add column if not exists automation_checked_at timestamptz;

alter table public.worldz_launchpad_ads
  drop constraint if exists worldz_launchpad_ads_status_check;

alter table public.worldz_launchpad_ads
  add constraint worldz_launchpad_ads_status_check
  check (status in (
    'auto_check',
    'deferred_auto',
    'approved',
    'payment_review',
    'active',
    'auto_rejected',
    'rejected',
    'expired',
    'cancelled'
  ));

update public.worldz_launchpad_ads
set status='auto_check',
    reviewer_note=coalesce(reviewer_note,'queued_for_worldz_validation'),
    updated_at=now()
where status='pending_review';

create index if not exists worldz_launchpad_ads_automation_idx
  on public.worldz_launchpad_ads(status,updated_at)
  where status in ('auto_check','deferred_auto','payment_review','active');
