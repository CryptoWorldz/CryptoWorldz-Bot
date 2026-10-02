-- WORLDZ VOTES CENTRE™ civic schema DRAFT.
-- NOT A DEPLOYMENT MIGRATION.
-- Binding civic voting is intentionally disabled until legal, privacy,
-- identity and independent security/audit gates are complete.
--
-- Privacy model: Worldz must not store the legal identity beside a vote.
-- A production eligibility provider must issue an unlinkable eligibility
-- receipt. This draft stores only that receipt hash and the ballot choice.

create table if not exists public.worldz_civic_ballots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  jurisdiction text not null,
  method text not null check (method in ('single-choice','approval','ranked-choice-irv')),
  status text not null default 'draft'
    check (status in ('draft','sourced','legal-review','preview','open','closed','counted','audited','archived')),
  binding_state text not null default 'non-binding-public-consultation'
    check (binding_state = 'non-binding-public-consultation'),
  legal_review_state text not null default 'required',
  official_authority_ref text,
  authorisation_text text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  source_bundle jsonb not null default '[]'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.worldz_civic_options (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.worldz_civic_ballots(id) on delete cascade,
  option_key text not null,
  label text not null,
  description text not null,
  display_weight integer not null default 1 check (display_weight = 1),
  paid_placement boolean not null default false check (paid_placement = false),
  source_bundle jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (ballot_id, option_key)
);

create table if not exists public.worldz_civic_votes (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.worldz_civic_ballots(id) on delete restrict,
  eligibility_receipt_hash text not null,
  selections jsonb not null,
  audit_receipt_hash text not null unique,
  cast_at timestamptz not null default now(),
  unique (ballot_id, eligibility_receipt_hash)
);

create table if not exists public.worldz_civic_concerns (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  place_label text not null,
  location_scope text not null default 'global'
    check (location_scope in ('global','country','territory','region','local')),
  country_or_territory_code text,
  topic text not null
    check (topic in (
      'food-and-hunger',
      'preventable-disease',
      'essential-healthcare-and-medicines',
      'clean-water-and-sanitation',
      'safe-shelter-and-housing',
      'education-and-opportunity',
      'public-money-and-resource-priorities',
      'other-public-concern'
    )),
  title text not null,
  summary text not null,
  language_code text,
  source_bundle jsonb not null default '[]'::jsonb,
  status text not null default 'review'
    check (status in ('review','published','rejected','archived')),
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Do not add race/ethnicity fields or exact home-address requirements to this
-- registry. Worldz Public Voice is about the concern, not demographic weighting.

create table if not exists public.worldz_civic_audit_events (
  id bigserial primary key,
  ballot_id uuid not null references public.worldz_civic_ballots(id) on delete cascade,
  event_type text not null,
  public_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists worldz_civic_ballots_status_time_idx
  on public.worldz_civic_ballots(status, opens_at, closes_at);
create index if not exists worldz_civic_votes_ballot_idx
  on public.worldz_civic_votes(ballot_id, cast_at);
create index if not exists worldz_civic_audit_ballot_idx
  on public.worldz_civic_audit_events(ballot_id, created_at);

alter table public.worldz_civic_ballots enable row level security;
alter table public.worldz_civic_options enable row level security;
alter table public.worldz_civic_votes enable row level security;
alter table public.worldz_civic_audit_events enable row level security;
alter table public.worldz_civic_concerns enable row level security;

-- Server-only by default. Public reads should go through a reviewed API that
-- exposes only approved ballot metadata/results and never eligibility hashes.
create policy "worldz_civic_ballots_server_only"
on public.worldz_civic_ballots for all to anon, authenticated
using (false) with check (false);

create policy "worldz_civic_options_server_only"
on public.worldz_civic_options for all to anon, authenticated
using (false) with check (false);

create policy "worldz_civic_votes_server_only"
on public.worldz_civic_votes for all to anon, authenticated
using (false) with check (false);

create policy "worldz_civic_audit_server_only"
on public.worldz_civic_audit_events for all to anon, authenticated
using (false) with check (false);

create policy "worldz_civic_concerns_server_only"
on public.worldz_civic_concerns for all to anon, authenticated
using (false) with check (false);


-- Match the existing protected ZED runtime bridge. The publishable-key server
-- client only passes these policies when x-zed-runtime-key satisfies the
-- existing zed_runtime_authorized() check. Ordinary anonymous requests remain denied.
create policy "zed_runtime_bridge" on public.worldz_civic_ballots
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_civic_options
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_civic_votes
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_civic_audit_events
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

create policy "zed_runtime_bridge" on public.worldz_civic_concerns
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

grant select, insert, update, delete on
  public.worldz_civic_ballots,
  public.worldz_civic_options,
  public.worldz_civic_votes,
  public.worldz_civic_audit_events,
  public.worldz_civic_concerns
to anon;

grant usage, select on sequence public.worldz_civic_audit_events_id_seq to anon;

comment on table public.worldz_civic_votes is
'Non-binding civic consultation votes only until independent identity/privacy/security/legal gates are complete. Never authorizes treasury or WorldzGovern actions.';

comment on table public.worldz_civic_concerns is
'Worldwide non-binding public concern registry. No race/ethnicity weighting, no exact home address requirement, no treasury execution, and public write access remains gated pending moderation/privacy/safety review.';
