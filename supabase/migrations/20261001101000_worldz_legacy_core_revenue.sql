-- Worldz Legacy Core Revenue Share™
-- Records approved Worldz-controlled revenue allocations for NBC, LMTD and INVEST.
-- Ledger only: no mainnet transfer, swap, buyback or distribution-wallet funding is performed here.

create table if not exists public.worldz_legacy_core_revenue_events (
  id bigint generated always as identity primary key,
  source_id text not null,
  source_reference text not null unique,
  source_chat_id bigint,
  source_plan text,
  source_package text,
  asset text not null default 'SOL' check (asset = 'SOL'),
  net_revenue_lamports numeric(30,0) not null check (net_revenue_lamports >= 0),
  legacy_core_pool_lamports numeric(30,0) not null check (legacy_core_pool_lamports >= 0),
  nbc_lamports numeric(30,0) not null check (nbc_lamports >= 0),
  lmtd_lamports numeric(30,0) not null check (lmtd_lamports >= 0),
  invest_lamports numeric(30,0) not null check (invest_lamports >= 0),
  rounding_lamports numeric(30,0) not null default 0 check (rounding_lamports >= 0),
  policy_version text not null,
  execution_state text not null default 'accrued'
    check (execution_state in ('accrued','vault_ready','approved','executed','cancelled')),
  allocation_detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worldz_legacy_core_revenue_events_source_idx
  on public.worldz_legacy_core_revenue_events(source_id, created_at desc);

create index if not exists worldz_legacy_core_revenue_events_state_idx
  on public.worldz_legacy_core_revenue_events(execution_state, created_at desc);

alter table public.worldz_legacy_core_revenue_events enable row level security;

drop policy if exists "zed_runtime_bridge" on public.worldz_legacy_core_revenue_events;
create policy "zed_runtime_bridge" on public.worldz_legacy_core_revenue_events
for all to anon
using (public.zed_runtime_authorized())
with check (public.zed_runtime_authorized());

grant select, insert, update on public.worldz_legacy_core_revenue_events to anon;
grant usage, select on sequence public.worldz_legacy_core_revenue_events_id_seq to anon;
revoke all on public.worldz_legacy_core_revenue_events from authenticated;
