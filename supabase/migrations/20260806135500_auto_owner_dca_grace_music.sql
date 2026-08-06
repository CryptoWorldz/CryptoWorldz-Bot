-- Auto Owner DCA + Grace Controller update.
-- Additive deployment: preserves every existing user, wallet, point, mission, reward and admin record.

-- Add the dedicated Grace Controller role without widening other scoped roles.
alter table public.bot_admins drop constraint if exists bot_admins_role_check;
alter table public.bot_admins add constraint bot_admins_role_check
  check (role in (
    'owner','admin','moderator','recap_manager','partner_manager','treasury_manager','grace_manager'
  )) not valid;
alter table public.bot_admins validate constraint bot_admins_role_check;

-- Music: Grace Controller only. The communication.broadcast override is the existing
-- Grace editor gate; direct Zed broadcasts are separately blocked for grace_manager.
insert into public.bot_admins (telegram_id, role, status, added_by, updated_at)
values (5457233387, 'grace_manager', 'active', 8029135300, now())
on conflict (telegram_id) do update set
  role = excluded.role,
  status = 'active',
  added_by = excluded.added_by,
  updated_at = now();

with music_permissions(permission) as (
  values
    ('communication.broadcast'),
    ('grace.view'),
    ('grace.draft'),
    ('grace.schedule'),
    ('grace.approve'),
    ('grace.results')
)
insert into public.bot_admin_permissions
  (telegram_id, permission, enabled, set_by, updated_at)
select 5457233387, permission, true, 8029135300, now()
from music_permissions
on conflict (telegram_id, permission) do update set
  enabled = true,
  set_by = excluded.set_by,
  updated_at = now();

-- Permit Auto audit records to distinguish the owner DCA service from legacy SAFE LOCKED simulation.
alter table public.auto_audit_log drop constraint if exists auto_audit_log_service_mode_check;
alter table public.auto_audit_log add constraint auto_audit_log_service_mode_check
  check (service_mode in ('safe_locked','owner_dca')) not valid;
alter table public.auto_audit_log validate constraint auto_audit_log_service_mode_check;

create table if not exists public.auto_dca_settings (
  id smallint primary key default 1 check (id = 1),
  mode text not null default 'owner_dca' check (mode = 'owner_dca'),
  enabled boolean not null default false,
  paused boolean not null default true,
  emergency_stop boolean not null default true,
  execution_enabled boolean not null default false,
  wallet_address text check (wallet_address is null or char_length(wallet_address) between 32 and 44),
  max_order_amount numeric(30,9) not null default 0 check (max_order_amount >= 0),
  max_daily_amount numeric(30,9) not null default 0 check (max_daily_amount >= 0),
  max_weekly_amount numeric(30,9) not null default 0 check (max_weekly_amount >= 0),
  max_monthly_amount numeric(30,9) not null default 0 check (max_monthly_amount >= 0),
  min_interval_minutes integer not null default 60 check (min_interval_minutes >= 15),
  max_slippage_bps integer not null default 300 check (max_slippage_bps between 1 and 5000),
  max_price_impact_bps integer not null default 500 check (max_price_impact_bps between 1 and 5000),
  updated_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.auto_dca_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.auto_dca_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_telegram_id bigint not null,
  token_mint text not null check (char_length(token_mint) between 32 and 44),
  input_currency text not null check (input_currency in ('SOL','USDC')),
  input_mint text not null check (char_length(input_mint) between 32 and 44),
  input_decimals integer not null check (input_decimals between 0 and 18),
  amount_per_buy numeric(30,9) not null check (amount_per_buy > 0),
  amount_base_units numeric(40,0) not null check (amount_base_units > 0),
  order_count integer not null check (order_count between 1 and 10000),
  completed_buys integer not null default 0 check (completed_buys >= 0 and completed_buys <= order_count),
  total_budget numeric(30,9) not null check (total_budget > 0),
  spent_amount numeric(30,9) not null default 0 check (spent_amount >= 0),
  interval_minutes integer not null check (interval_minutes >= 15),
  slippage_bps integer not null check (slippage_bps between 1 and 5000),
  max_price_impact_bps integer not null check (max_price_impact_bps between 1 and 5000),
  status text not null default 'draft' check (status in ('draft','active','paused','cancelled','completed','error')),
  next_run_at timestamptz,
  last_signature text,
  last_error text,
  locked_by text,
  locked_until timestamptz,
  created_by bigint not null,
  updated_by bigint,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auto_dca_executions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.auto_dca_schedules(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  status text not null default 'processing' check (status in ('processing','success','failed')),
  input_currency text not null check (input_currency in ('SOL','USDC')),
  input_amount numeric(30,9) not null check (input_amount > 0),
  input_amount_base_units numeric(40,0) not null check (input_amount_base_units > 0),
  output_amount_base_units numeric(40,0),
  price_impact_bps integer,
  request_id text,
  router text,
  transaction_signature text,
  error_code text,
  result_payload jsonb not null default '{}'::jsonb,
  worker_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (schedule_id, sequence_number)
);

create index if not exists auto_dca_schedules_due_idx
  on public.auto_dca_schedules(status, next_run_at)
  where status = 'active';
create index if not exists auto_dca_schedules_owner_idx
  on public.auto_dca_schedules(owner_telegram_id, created_at desc);
create index if not exists auto_dca_executions_schedule_idx
  on public.auto_dca_executions(schedule_id, sequence_number desc);
create unique index if not exists auto_dca_success_signature_unique_idx
  on public.auto_dca_executions(transaction_signature)
  where transaction_signature is not null;

alter table public.auto_dca_settings enable row level security;
alter table public.auto_dca_schedules enable row level security;
alter table public.auto_dca_executions enable row level security;

revoke all on table public.auto_dca_settings from anon, authenticated;
revoke all on table public.auto_dca_schedules from anon, authenticated;
revoke all on table public.auto_dca_executions from anon, authenticated;
grant all on table public.auto_dca_settings to service_role;
grant all on table public.auto_dca_schedules to service_role;
grant all on table public.auto_dca_executions to service_role;

create or replace function public.claim_auto_dca_schedule(p_worker_id text)
returns setof public.auto_dca_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.auto_dca_schedules%rowtype;
begin
  if p_worker_id is null or char_length(trim(p_worker_id)) < 3 then
    return;
  end if;

  if not exists (
    select 1
    from public.auto_dca_settings
    where id = 1
      and enabled = true
      and execution_enabled = true
      and paused = false
      and emergency_stop = false
      and wallet_address is not null
  ) then
    return;
  end if;

  select * into claimed
  from public.auto_dca_schedules
  where status = 'active'
    and completed_buys < order_count
    and next_run_at is not null
    and next_run_at <= now()
    and (locked_until is null or locked_until < now())
  order by next_run_at asc, created_at asc
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.auto_dca_schedules
  set locked_by = p_worker_id,
      locked_until = now() + interval '2 minutes',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;

revoke all on function public.claim_auto_dca_schedule(text) from public, anon, authenticated;
grant execute on function public.claim_auto_dca_schedule(text) to service_role;

comment on table public.auto_dca_settings is
  'Owner-only buy DCA controls. Disabled, paused and emergency-stopped until a dedicated public wallet and separate secure executor are configured.';
comment on table public.auto_dca_schedules is
  'Buy-only schedules for one owner-approved Solana token and one dedicated wallet. No sell or multi-wallet automation.';
comment on table public.auto_dca_executions is
  'Immutable execution-attempt ledger. Successful rows may contain public transaction signatures; no signing secret is stored.';
