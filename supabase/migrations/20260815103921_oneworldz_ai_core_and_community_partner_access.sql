create table if not exists public.oneworldz_ai_partner_access (
  id uuid primary key default gen_random_uuid(),
  support_profile_id bigint not null unique references public.oneworldz_support_profiles(id) on delete cascade,
  auth_user_id uuid null references auth.users(id) on delete set null,
  role text not null default 'community_partner' check (role in ('community_partner','researcher','admin','owner')),
  status text not null default 'eligible' check (status in ('eligible','invited','active','suspended','revoked')),
  capabilities jsonb not null default jsonb_build_object(
    'research', true,
    'draft_posts', true,
    'create_image_requests', true,
    'submit_for_approval', true,
    'publish_directly', false,
    'manage_billing', false
  ),
  invited_at timestamptz null,
  activated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oneworldz_ai_partner_auth_user on public.oneworldz_ai_partner_access(auth_user_id) where auth_user_id is not null;
create index if not exists idx_oneworldz_ai_partner_status on public.oneworldz_ai_partner_access(status);

insert into public.oneworldz_ai_partner_access (support_profile_id)
select p.id from public.oneworldz_support_profiles p
where p.status = 'active'
on conflict (support_profile_id) do nothing;

create table if not exists public.oneworldz_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('oneworldz','robin_hood_law','cryptoworldz','grace','community_impact','support','general_research')),
  slug text not null,
  title text not null,
  summary text null,
  body text not null,
  source_url text null,
  source_type text not null default 'internal' check (source_type in ('internal','official','research','community','web')),
  visibility text not null default 'internal' check (visibility in ('public','partner','internal')),
  verification_status text not null default 'draft' check (verification_status in ('draft','review','verified','retired')),
  version integer not null default 1 check (version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  verified_by uuid null references auth.users(id) on delete set null,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(domain, slug, version)
);

create index if not exists idx_oneworldz_knowledge_domain_status on public.oneworldz_knowledge_items(domain, verification_status);
create index if not exists idx_oneworldz_knowledge_visibility on public.oneworldz_knowledge_items(visibility, verification_status);

create table if not exists public.oneworldz_research_projects (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('oneworldz','robin_hood_law','cryptoworldz','community_impact','general_research')),
  title text not null,
  research_question text not null,
  status text not null default 'draft' check (status in ('draft','researching','review','verified','published','archived')),
  requester_user_id uuid null references auth.users(id) on delete set null,
  partner_access_id uuid null references public.oneworldz_ai_partner_access(id) on delete set null,
  approval_required boolean not null default true,
  approved_by uuid null references auth.users(id) on delete set null,
  approved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oneworldz_research_domain_status on public.oneworldz_research_projects(domain, status);
create index if not exists idx_oneworldz_research_requester on public.oneworldz_research_projects(requester_user_id);

create table if not exists public.oneworldz_research_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.oneworldz_research_projects(id) on delete cascade,
  title text not null,
  summary text not null,
  source_url text null,
  source_publisher text null,
  source_date date null,
  evidence jsonb not null default '{}'::jsonb,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','review','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oneworldz_research_findings_project on public.oneworldz_research_findings(project_id, verification_status);

create table if not exists public.oneworldz_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('research','law_research','post_draft','image_request','campaign_plan','summary','website_copy','support_guidance')),
  domain text not null default 'oneworldz',
  requester_user_id uuid null references auth.users(id) on delete set null,
  partner_access_id uuid null references public.oneworldz_ai_partner_access(id) on delete set null,
  research_project_id uuid null references public.oneworldz_research_projects(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','awaiting_approval','approved','rejected','completed','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  approval_required boolean not null default true,
  approved_by uuid null references auth.users(id) on delete set null,
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_oneworldz_ai_jobs_requester on public.oneworldz_ai_jobs(requester_user_id, created_at desc);
create index if not exists idx_oneworldz_ai_jobs_partner on public.oneworldz_ai_jobs(partner_access_id, created_at desc);
create index if not exists idx_oneworldz_ai_jobs_status on public.oneworldz_ai_jobs(status, created_at desc);

create table if not exists public.oneworldz_ai_grace_links (
  id uuid primary key default gen_random_uuid(),
  ai_job_id uuid not null unique references public.oneworldz_ai_jobs(id) on delete cascade,
  grace_post_id uuid null references public.grace_posts(id) on delete set null,
  grace_campaign_id uuid null references public.grace_campaigns(id) on delete set null,
  status text not null default 'prepared' check (status in ('prepared','submitted','approved','published','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oneworldz_ai_usage (
  id bigint generated by default as identity primary key,
  job_id uuid null references public.oneworldz_ai_jobs(id) on delete set null,
  auth_user_id uuid null references auth.users(id) on delete set null,
  partner_access_id uuid null references public.oneworldz_ai_partner_access(id) on delete set null,
  provider text not null default 'openai',
  model text not null,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  image_generations integer not null default 0 check (image_generations >= 0),
  web_searches integer not null default 0 check (web_searches >= 0),
  cost_usd numeric(14,6) not null default 0 check (cost_usd >= 0),
  cost_status text not null default 'estimated' check (cost_status in ('estimated','actual','reconciled')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_oneworldz_ai_usage_time on public.oneworldz_ai_usage(occurred_at desc);
create index if not exists idx_oneworldz_ai_usage_partner on public.oneworldz_ai_usage(partner_access_id, occurred_at desc);
create index if not exists idx_oneworldz_ai_usage_user on public.oneworldz_ai_usage(auth_user_id, occurred_at desc);

create table if not exists public.oneworldz_ai_budgets (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('global','partner','domain')),
  scope_key text not null,
  currency text not null default 'USD',
  weekly_soft_limit numeric(12,2) null check (weekly_soft_limit is null or weekly_soft_limit >= 0),
  monthly_soft_limit numeric(12,2) null check (monthly_soft_limit is null or monthly_soft_limit >= 0),
  monthly_hard_limit numeric(12,2) null check (monthly_hard_limit is null or monthly_hard_limit >= 0),
  alert_percentages integer[] not null default array[50,75,90,100],
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scope_type, scope_key)
);

insert into public.oneworldz_ai_budgets(scope_type, scope_key, metadata)
values ('global','oneworldz', jsonb_build_object('mode','track_first_set_limits_after_observation'))
on conflict (scope_type, scope_key) do nothing;

create or replace function public.oneworldz_ai_touch_updated_at()
returns trigger language plpgsql set search_path = 'public','pg_temp'
as $$ begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['oneworldz_ai_partner_access','oneworldz_knowledge_items','oneworldz_research_projects','oneworldz_research_findings','oneworldz_ai_jobs','oneworldz_ai_grace_links','oneworldz_ai_budgets'] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.oneworldz_ai_touch_updated_at()', t, t);
  end loop;
end $$;

alter table public.oneworldz_ai_partner_access enable row level security;
alter table public.oneworldz_knowledge_items enable row level security;
alter table public.oneworldz_research_projects enable row level security;
alter table public.oneworldz_research_findings enable row level security;
alter table public.oneworldz_ai_jobs enable row level security;
alter table public.oneworldz_ai_grace_links enable row level security;
alter table public.oneworldz_ai_usage enable row level security;
alter table public.oneworldz_ai_budgets enable row level security;

create policy "Public can read verified public OneWorldz knowledge" on public.oneworldz_knowledge_items for select to anon, authenticated using (visibility = 'public' and verification_status = 'verified');
create policy "Partners can read own access" on public.oneworldz_ai_partner_access for select to authenticated using (auth_user_id = auth.uid());
create policy "Authenticated users can create own research" on public.oneworldz_research_projects for insert to authenticated with check (requester_user_id = auth.uid());
create policy "Authenticated users can read own research" on public.oneworldz_research_projects for select to authenticated using (requester_user_id = auth.uid());
create policy "Authenticated users can update own draft research" on public.oneworldz_research_projects for update to authenticated using (requester_user_id = auth.uid() and status in ('draft','researching')) with check (requester_user_id = auth.uid());
create policy "Authenticated users can read findings for own research" on public.oneworldz_research_findings for select to authenticated using (exists (select 1 from public.oneworldz_research_projects p where p.id = project_id and p.requester_user_id = auth.uid()));
create policy "Authenticated users can create own AI jobs" on public.oneworldz_ai_jobs for insert to authenticated with check (requester_user_id = auth.uid());
create policy "Authenticated users can read own AI jobs" on public.oneworldz_ai_jobs for select to authenticated using (requester_user_id = auth.uid());
create policy "Authenticated users can read own AI usage" on public.oneworldz_ai_usage for select to authenticated using (auth_user_id = auth.uid());
