-- WorldzLaunchPad sponsored ad spots.
-- Public submissions are accepted only through the Edge Function; activation stays human-reviewed.

create table if not exists public.worldz_launchpad_ads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','active','rejected','expired','cancelled')),
  project_name text not null check (char_length(project_name) between 2 and 80),
  token_symbol text check (token_symbol is null or char_length(token_symbol) <= 20),
  chain text check (chain is null or char_length(chain) <= 40),
  target_url text not null,
  banner_url text not null,
  contact text not null check (char_length(contact) between 3 and 180),
  slot text not null
    check (slot in ('home_spotlight','community_spotlight','launch_station_spotlight')),
  package_code text not null
    check (package_code in ('one_day','three_day','seven_day','thirty_day')),
  price_aud numeric(10,2) not null check (price_aud > 0),
  duration_days integer not null check (duration_days in (1,3,7,30)),
  start_at timestamptz,
  end_at timestamptz,
  payment_currency text check (payment_currency is null or payment_currency in ('SOL','USDC')),
  payment_signature text,
  payment_amount numeric(24,9),
  reviewer_note text,
  approved_by bigint,
  approved_at timestamptz,
  activated_at timestamptz
);

create index if not exists worldz_launchpad_ads_public_idx
  on public.worldz_launchpad_ads(slot,status,start_at,end_at);

create index if not exists worldz_launchpad_ads_contact_idx
  on public.worldz_launchpad_ads(contact,created_at desc);

alter table public.worldz_launchpad_ads enable row level security;
revoke all on public.worldz_launchpad_ads from anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'launchpad-ad-banners',
  'launchpad-ad-banners',
  true,
  5242880,
  array['image/jpeg','image/png','image/gif','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
