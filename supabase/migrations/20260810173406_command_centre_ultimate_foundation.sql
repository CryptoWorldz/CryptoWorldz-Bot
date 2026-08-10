-- Command Centre Ultimate foundation.
-- Control plane only: no banking credentials, signing secrets, transfers or trades.

create table if not exists public.ultimate_settings (
  workspace_id uuid primary key references public.grace_workspaces(id) on delete cascade,
  enabled boolean not null default false,
  planner_enabled boolean not null default true,
  execution_enabled boolean not null default false,
  paused boolean not null default true,
  emergency_stop boolean not null default true,
  timezone text not null default 'Australia/Sydney',
  funding_hour smallint not null default 18 check (funding_hour between 0 and 23),
  funding_minute smallint not null default 30 check (funding_minute between 0 and 59),
  weekdays smallint[] not null default array[1,2,3,4,5]::smallint[],
  approval_threshold smallint not null default 2 check (approval_threshold = 2),
  signer_count smallint not null default 3 check (signer_count = 3),
  allocation_bps jsonb not null default '{"treasury":3500,"dev_grace_operations":2500,"rewards":2000,"owner_diamond_buy":2000}'::jsonb,
  high_risk_owner_required jsonb not null default '["funding_rail_change","wallet_change","token_launch","limits_change","disable_emergency_stop","signer_change"]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ultimate_signers (
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  telegram_id bigint not null,
  handle text,
  role text not null check (role in ('owner','approver','disabled')),
  immutable_owner boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, telegram_id),
  check (not immutable_owner or (role = 'owner' and active = true))
);

create unique index if not exists ultimate_one_active_owner_per_workspace
  on public.ultimate_signers(workspace_id)
  where role = 'owner' and active = true;

create or replace function public.guard_ultimate_immutable_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.immutable_owner then
    raise exception 'Command Centre Ultimate owner signer is immutable';
  end if;
  if tg_op = 'UPDATE' and old.immutable_owner then
    if new.workspace_id is distinct from old.workspace_id
       or new.telegram_id is distinct from old.telegram_id
       or new.role is distinct from 'owner'
       or new.immutable_owner is distinct from true
       or new.active is distinct from true then
      raise exception 'Command Centre Ultimate owner signer cannot be removed or demoted';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.guard_ultimate_immutable_owner() from public, anon, authenticated;

drop trigger if exists ultimate_guard_immutable_owner on public.ultimate_signers;
create trigger ultimate_guard_immutable_owner
before update or delete on public.ultimate_signers
for each row execute function public.guard_ultimate_immutable_owner();

create table if not exists public.ultimate_wallet_slots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  slot_key text not null,
  label text not null,
  purpose text not null,
  network text not null default 'solana',
  public_address text,
  allocation_bps integer not null check (allocation_bps between 0 and 10000),
  status text not null default 'pending_address' check (status in ('pending_address','ready','frozen','retired')),
  requires_owner_approval boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slot_key)
);

create table if not exists public.ultimate_funding_rails (
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  rail_key text not null,
  display_name text not null,
  rail_type text not null,
  status text not null,
  planner_enabled boolean not null default false,
  execution_enabled boolean not null default false,
  credential_secret_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, rail_key),
  check (execution_enabled = false or credential_secret_ref is not null)
);

create table if not exists public.ultimate_proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  proposal_type text not null,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','ready','executed','rejected','cancelled','failed')),
  amount numeric,
  currency text,
  scheduled_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_by bigint not null,
  owner_approval_required boolean not null default false,
  external_authorization_required boolean not null default true,
  approved_at timestamptz,
  executed_at timestamptz,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount is null or amount > 0)
);

create table if not exists public.ultimate_approvals (
  proposal_id uuid not null references public.ultimate_proposals(id) on delete cascade,
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  telegram_id bigint not null,
  decision text not null check (decision in ('approve','reject')),
  note text,
  created_at timestamptz not null default now(),
  primary key (proposal_id, telegram_id)
);

create table if not exists public.ultimate_audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  action text not null,
  actor_telegram_id bigint,
  proposal_id uuid references public.ultimate_proposals(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ultimate_token_launch_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.grace_workspaces(id) on delete cascade,
  token_key text not null,
  name text not null,
  symbol text not null,
  network text not null default 'solana',
  launch_platform text not null default 'based.bid',
  status text not null default 'draft' check (status in ('draft','legal_review','approved','launch_ready','launched','paused','cancelled')),
  initial_creator_fee_bps integer not null default 100 check (initial_creator_fee_bps between 0 and 300),
  growth_creator_fee_bps integer not null default 75 check (growth_creator_fee_bps between 0 and 300),
  mature_creator_fee_bps integer not null default 50 check (mature_creator_fee_bps between 0 and 300),
  proceeds_allocation_bps jsonb not null default '{"charity":3000,"liquidity":2500,"dev":2000,"team":1500,"buyback_burn_reserve":1000}'::jsonb,
  legal_gate_status text not null default 'required',
  market_support_automation boolean not null default false check (market_support_automation = false),
  metadata jsonb not null default '{}'::jsonb,
  created_by bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, token_key)
);

create index if not exists ultimate_proposals_status_schedule_idx
  on public.ultimate_proposals(workspace_id, status, scheduled_at);
create index if not exists ultimate_audit_workspace_created_idx
  on public.ultimate_audit_log(workspace_id, created_at desc);

alter table public.ultimate_settings enable row level security;
alter table public.ultimate_signers enable row level security;
alter table public.ultimate_wallet_slots enable row level security;
alter table public.ultimate_funding_rails enable row level security;
alter table public.ultimate_proposals enable row level security;
alter table public.ultimate_approvals enable row level security;
alter table public.ultimate_audit_log enable row level security;
alter table public.ultimate_token_launch_plans enable row level security;

revoke all on public.ultimate_settings from anon, authenticated;
revoke all on public.ultimate_signers from anon, authenticated;
revoke all on public.ultimate_wallet_slots from anon, authenticated;
revoke all on public.ultimate_funding_rails from anon, authenticated;
revoke all on public.ultimate_proposals from anon, authenticated;
revoke all on public.ultimate_approvals from anon, authenticated;
revoke all on public.ultimate_audit_log from anon, authenticated;
revoke all on public.ultimate_token_launch_plans from anon, authenticated;

grant all on public.ultimate_settings to service_role;
grant all on public.ultimate_signers to service_role;
grant all on public.ultimate_wallet_slots to service_role;
grant all on public.ultimate_funding_rails to service_role;
grant all on public.ultimate_proposals to service_role;
grant all on public.ultimate_approvals to service_role;
grant all on public.ultimate_audit_log to service_role;
grant all on public.ultimate_token_launch_plans to service_role;

insert into public.ultimate_settings (workspace_id, metadata)
select id, jsonb_build_object(
  'brand', 'Command Centre Ultimate™',
  'foundation_version', 'v1',
  'funding_schedule_label', 'Monday-Friday 18:30 Australia/Sydney',
  'execution_note', 'Control plane only. External bank/exchange/wallet authorization remains mandatory.'
)
from public.grace_workspaces
where slug = 'cryptoworldz'
on conflict (workspace_id) do update
set planner_enabled = true,
    execution_enabled = false,
    paused = true,
    emergency_stop = true,
    timezone = 'Australia/Sydney',
    funding_hour = 18,
    funding_minute = 30,
    weekdays = array[1,2,3,4,5]::smallint[],
    approval_threshold = 2,
    signer_count = 3,
    allocation_bps = excluded.allocation_bps,
    high_risk_owner_required = excluded.high_risk_owner_required,
    metadata = public.ultimate_settings.metadata || excluded.metadata,
    updated_at = now();

insert into public.ultimate_signers (workspace_id, telegram_id, handle, role, immutable_owner, active)
select id, 8029135300, 'JayJayTeamDev', 'owner', true, true from public.grace_workspaces where slug = 'cryptoworldz'
on conflict (workspace_id, telegram_id) do update
set handle = excluded.handle, role = 'owner', immutable_owner = true, active = true, updated_at = now();

insert into public.ultimate_signers (workspace_id, telegram_id, handle, role, immutable_owner, active)
select id, 7615025841, 'stepper_web_3', 'approver', false, true from public.grace_workspaces where slug = 'cryptoworldz'
on conflict (workspace_id, telegram_id) do update
set handle = excluded.handle, role = 'approver', active = true, updated_at = now();

insert into public.ultimate_signers (workspace_id, telegram_id, handle, role, immutable_owner, active)
select id, 8604306923, 'Re_me_dy', 'approver', false, true from public.grace_workspaces where slug = 'cryptoworldz'
on conflict (workspace_id, telegram_id) do update
set handle = excluded.handle, role = 'approver', active = true, updated_at = now();

insert into public.ultimate_wallet_slots (workspace_id, slot_key, label, purpose, allocation_bps, metadata)
select id, seed.slot_key, seed.label, seed.purpose, seed.allocation_bps,
       jsonb_build_object('address_state','owner_registration_required','execution_enabled',false)
from public.grace_workspaces
cross join (values
  ('treasury','Treasury Wallet','Core treasury reserve',3500),
  ('dev_grace_operations','Dev + Grace Operations Wallet','Development and Grace Auto Post operations',2500),
  ('rewards','Rewards Wallet','Points and approved community rewards',2000),
  ('owner_diamond_buy','Owner Diamond Buy™ Wallet','Owner-only transparent investment allocation',2000)
) as seed(slot_key,label,purpose,allocation_bps)
where slug = 'cryptoworldz'
on conflict (workspace_id, slot_key) do update
set label = excluded.label,
    purpose = excluded.purpose,
    allocation_bps = excluded.allocation_bps,
    metadata = public.ultimate_wallet_slots.metadata || excluded.metadata,
    updated_at = now();

insert into public.ultimate_funding_rails (workspace_id, rail_key, display_name, rail_type, status, planner_enabled, execution_enabled, metadata)
select id, seed.rail_key, seed.display_name, seed.rail_type, seed.status, seed.planner_enabled, false, seed.metadata
from public.grace_workspaces
cross join (values
  ('westpac','Westpac','fiat_source','external_schedule_required',true,jsonb_build_object('primary',true,'credentials_stored',false)),
  ('coinbase','Coinbase Australia','fiat_crypto_bridge','adapter_pending',true,jsonb_build_object('account_capability_check_required',true,'credentials_stored',false)),
  ('jupiter','Jupiter','solana_execution','adapter_pending',true,jsonb_build_object('external_signer_required',true,'credentials_stored',false)),
  ('paypal','PayPal','alternate_fiat_source','not_selected',false,jsonb_build_object('primary',false,'credentials_stored',false)),
  ('stripe','Stripe','business_operations','operations_only',false,jsonb_build_object('treasury_rail',false,'credentials_stored',false))
) as seed(rail_key,display_name,rail_type,status,planner_enabled,metadata)
where slug = 'cryptoworldz'
on conflict (workspace_id, rail_key) do update
set display_name = excluded.display_name,
    rail_type = excluded.rail_type,
    status = excluded.status,
    planner_enabled = excluded.planner_enabled,
    execution_enabled = false,
    metadata = public.ultimate_funding_rails.metadata || excluded.metadata,
    updated_at = now();

insert into public.ultimate_audit_log (workspace_id, action, actor_telegram_id, details)
select id, 'ultimate.foundation.initialized', owner_telegram_id,
       jsonb_build_object('version','v1','execution_enabled',false,'approval_threshold',2,'signer_count',3)
from public.grace_workspaces
where slug = 'cryptoworldz';

comment on table public.ultimate_settings is 'Command Centre Ultimate control-plane settings. Execution is disabled by default and external authorization is mandatory.';
comment on table public.ultimate_signers is 'Three-signer approval registry. JayJayTeamDev is the immutable owner signer; sensitive changes require owner participation.';
comment on table public.ultimate_wallet_slots is 'Public-address-only operational wallet slots. Never store private keys or seed phrases here.';
comment on table public.ultimate_funding_rails is 'Funding rail registry and readiness state. Credentials remain in external secret stores/providers, never in this table.';
comment on table public.ultimate_token_launch_plans is 'Token launch planning only; each launch requires a legal classification gate and owner/multisig approval.';
