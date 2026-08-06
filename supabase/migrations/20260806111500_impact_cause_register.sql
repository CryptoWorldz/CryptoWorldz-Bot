-- Impact Cause Register
-- Stores verified causes for Zed, Grace and Auto while keeping publishing owner-approved.

create table if not exists public.impact_causes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  cause text not null check (char_length(cause) between 2 and 160),
  organiser text not null check (char_length(organiser) between 2 and 160),
  location text not null check (char_length(location) between 2 and 160),
  needs text not null check (char_length(needs) between 2 and 1000),
  priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  platforms text[] not null default '{}'::text[] check (
    cardinality(platforms) > 0
    and platforms <@ array['facebook','x','telegram','instagram','youtube','tiktok']::text[]
  ),
  tracking text not null default '',
  fundraiser_url text,
  facebook_url text,
  approval_required boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by bigint,
  updated_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists impact_causes_status_priority_idx
  on public.impact_causes (status, priority, created_at);

create or replace function public.impact_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger impact_causes_touch_updated_at
before update on public.impact_causes
for each row execute function public.impact_touch_updated_at();

insert into public.impact_causes (
  slug,
  cause,
  organiser,
  location,
  needs,
  priority,
  platforms,
  tracking,
  fundraiser_url,
  facebook_url,
  approval_required,
  status,
  metadata,
  created_by,
  updated_by
)
values (
  'the-davis-family',
  'The Davis Family',
  'Teighlor Davis',
  'Mityana, Uganda',
  'Rent, food, medication and school supplies',
  'urgent',
  array['facebook','x','telegram']::text[],
  'JayJayTeamDev unique GoFundMe share link',
  'https://www.gofundme.com/f/the-davis-family-w4qys/cl/s?utm_campaign=fp_sharesheet&utm_content=amp30-no-carousel&utm_medium=customer&utm_source=copy_link&lang=en_GB',
  'https://www.facebook.com/profile.php?id=61572127563435',
  true,
  'active',
  '{"source":"JayJayTeamDev","tracking_url_status":"pending_unique_link"}'::jsonb,
  8029135300,
  8029135300
)
on conflict (slug) do update
set cause = excluded.cause,
    organiser = excluded.organiser,
    location = excluded.location,
    needs = excluded.needs,
    priority = excluded.priority,
    platforms = excluded.platforms,
    tracking = excluded.tracking,
    fundraiser_url = excluded.fundraiser_url,
    facebook_url = excluded.facebook_url,
    approval_required = true,
    status = 'active',
    metadata = public.impact_causes.metadata || excluded.metadata,
    updated_by = excluded.updated_by,
    updated_at = now();

alter table public.impact_causes enable row level security;
revoke all on table public.impact_causes from anon, authenticated;
