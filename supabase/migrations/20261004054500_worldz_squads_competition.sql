-- Worldz Squads™ competition foundation.
-- Additive only. No existing Worldz reward, raid, shill or treasury data is changed.

create table if not exists public.worldz_squads (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,31}$'),
  name text not null check (char_length(name) between 3 and 48),
  description text not null default '',
  owner_telegram_id bigint not null references public.users(telegram_id) on delete restrict,
  avatar_url text,
  banner_url text,
  join_mode text not null default 'open' check (join_mode in ('open','closed')),
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worldz_squad_members (
  squad_id uuid not null references public.worldz_squads(id) on delete cascade,
  telegram_id bigint not null references public.users(telegram_id) on delete cascade,
  role text not null default 'member' check (role in ('owner','captain','member')),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (squad_id, telegram_id)
);

create unique index if not exists worldz_squad_one_active_membership_idx
  on public.worldz_squad_members(telegram_id)
  where active = true;

create index if not exists worldz_squad_members_squad_active_idx
  on public.worldz_squad_members(squad_id, active, joined_at);

create table if not exists public.worldz_squad_performance (
  squad_id uuid not null references public.worldz_squads(id) on delete cascade,
  telegram_id bigint not null references public.users(telegram_id) on delete cascade,
  period text not null check (period in ('1D','1W','1M')),
  pnl_usd numeric(18,2) not null default 0,
  banked_usd numeric(18,2) not null default 0,
  volume_usd numeric(20,2) not null default 0,
  trades integer not null default 0 check (trades >= 0),
  source text not null default 'trusted_indexer',
  source_ref text,
  observed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (squad_id, telegram_id, period)
);

create index if not exists worldz_squad_performance_period_idx
  on public.worldz_squad_performance(period, updated_at desc);

alter table public.worldz_squads enable row level security;
alter table public.worldz_squad_members enable row level security;
alter table public.worldz_squad_performance enable row level security;

drop policy if exists worldz_squads_runtime on public.worldz_squads;
create policy worldz_squads_runtime on public.worldz_squads
  for all
  using (coalesce(auth.role(),'') = 'service_role' or public.zed_runtime_authorized())
  with check (coalesce(auth.role(),'') = 'service_role' or public.zed_runtime_authorized());

drop policy if exists worldz_squad_members_runtime on public.worldz_squad_members;
create policy worldz_squad_members_runtime on public.worldz_squad_members
  for all
  using (coalesce(auth.role(),'') = 'service_role' or public.zed_runtime_authorized())
  with check (coalesce(auth.role(),'') = 'service_role' or public.zed_runtime_authorized());

drop policy if exists worldz_squad_performance_runtime_read on public.worldz_squad_performance;
create policy worldz_squad_performance_runtime_read on public.worldz_squad_performance
  for select
  using (coalesce(auth.role(),'') = 'service_role' or public.zed_runtime_authorized());

drop policy if exists worldz_squad_performance_service_write on public.worldz_squad_performance;
create policy worldz_squad_performance_service_write on public.worldz_squad_performance
  for all
  using (coalesce(auth.role(),'') = 'service_role')
  with check (coalesce(auth.role(),'') = 'service_role');

grant select, insert, update, delete on public.worldz_squads to anon, authenticated, service_role;
grant select, insert, update, delete on public.worldz_squad_members to anon, authenticated, service_role;
grant select on public.worldz_squad_performance to anon, authenticated, service_role;
grant insert, update, delete on public.worldz_squad_performance to service_role;

-- Mirror the already-existing Worldz-linked Pump squad into the native Worldz Squads directory
-- only when the registered owner account is present. No Pump PNL is copied or invented.
insert into public.worldz_squads (slug,name,description,owner_telegram_id,join_mode,status)
select
  'thechaos',
  'THECHAOS',
  'Worldz-linked squad. External Pump.fun squad remains connected separately; Worldz-native activity and verified trading performance are tracked here.',
  u.telegram_id,
  'open',
  'active'
from public.users u
where lower(coalesce(u.username,'')) = 'jayjayteamdev'
order by u.id
limit 1
on conflict (slug) do nothing;

insert into public.worldz_squad_members (squad_id,telegram_id,role,active)
select s.id,u.telegram_id,'owner',true
from public.worldz_squads s
join public.users u on u.telegram_id=s.owner_telegram_id
where s.slug='thechaos'
on conflict (squad_id,telegram_id) do update
set role='owner',active=true,left_at=null,updated_at=now();
