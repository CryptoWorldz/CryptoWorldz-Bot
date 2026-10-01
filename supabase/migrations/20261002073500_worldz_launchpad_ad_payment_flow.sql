-- Complete WorldzLaunchPad Spotlight review -> payment -> activation flow.
-- Public rows remain inaccessible through PostgREST unless the protected ZED runtime key passes RLS.

alter table public.worldz_launchpad_ads
  add column if not exists payment_destination text,
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_sender text,
  add column if not exists payment_slot bigint,
  add column if not exists activated_by bigint;

alter table public.worldz_launchpad_ads
  drop constraint if exists worldz_launchpad_ads_status_check;

alter table public.worldz_launchpad_ads
  add constraint worldz_launchpad_ads_status_check
  check (status in (
    'pending_review',
    'approved',
    'payment_review',
    'active',
    'rejected',
    'expired',
    'cancelled'
  ));

create unique index if not exists worldz_launchpad_ads_payment_signature_unique
  on public.worldz_launchpad_ads(payment_signature)
  where payment_signature is not null;

alter table public.worldz_launchpad_ads enable row level security;

drop policy if exists "zed_runtime_bridge" on public.worldz_launchpad_ads;
create policy "zed_runtime_bridge" on public.worldz_launchpad_ads
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

grant select, update on public.worldz_launchpad_ads to anon;
grant select, insert, update, delete on public.worldz_launchpad_ads to service_role;
revoke all on public.worldz_launchpad_ads from authenticated;
