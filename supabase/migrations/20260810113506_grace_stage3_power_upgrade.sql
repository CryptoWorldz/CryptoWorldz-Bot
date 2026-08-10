create table if not exists public.grace_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  name text not null,
  objective text not null default '',
  status text not null default 'draft',
  start_at timestamptz,
  end_at timestamptz,
  created_by bigint not null,
  approved_by bigint,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grace_ad_budgets (
  id bigserial primary key,
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  campaign_id uuid references public.grace_campaigns(id) on delete cascade,
  platform text not null,
  currency text not null default 'USD',
  budget_total numeric(12,2) not null default 0,
  spend_to_date numeric(12,2) not null default 0,
  status text not null default 'draft',
  approved_by bigint,
  approved_at timestamptz,
  created_by bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grace_campaign_events (
  id bigserial primary key,
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  campaign_id uuid references public.grace_campaigns(id) on delete cascade,
  event_type text not null,
  actor_telegram_id bigint,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists grace_campaigns_workspace_status_idx on public.grace_campaigns(workspace_id,status);
create index if not exists grace_ad_budgets_workspace_status_idx on public.grace_ad_budgets(workspace_id,status);
create index if not exists grace_campaign_events_campaign_created_idx on public.grace_campaign_events(campaign_id,created_at desc);

alter table public.grace_campaigns enable row level security;
alter table public.grace_ad_budgets enable row level security;
alter table public.grace_campaign_events enable row level security;
