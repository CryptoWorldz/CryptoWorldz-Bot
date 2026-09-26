-- WorldzFullScope™ foundation
-- Popularity voting (Worldz Votes Centre™) and governance (WorldzGovern™) are deliberately separate systems.

create extension if not exists pgcrypto;

create table if not exists public.worldz_fullscope_chains (
  chain_key text primary key,
  label text not null,
  family text not null check (family in ('solana','xrpl','evm','sui')),
  enabled boolean not null default true,
  max_tokens integer not null default 20 check (max_tokens = 20),
  mainnet_execution_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.worldz_fullscope_chains (chain_key,label,family)
values
  ('solana','Solana','solana'),
  ('xrpl','XRP Ledger','xrpl'),
  ('base','Base','evm'),
  ('ethereum','Ethereum','evm'),
  ('bnb','BNB Smart Chain','evm'),
  ('sui','Sui','sui'),
  ('hyperevm','HyperEVM','evm'),
  ('robinhood','Robinhood Chain','evm')
on conflict (chain_key) do update
set label=excluded.label, family=excluded.family, max_tokens=20, updated_at=now();

create table if not exists public.worldz_fullscope_tokens (
  id uuid primary key default gen_random_uuid(),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  name text not null,
  symbol text not null,
  contract_address text,
  decimals integer check (decimals between 0 and 30),
  status text not null default 'planned' check (status in ('planned','prepared','live','paused','retired')),
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists worldz_fullscope_token_symbol_chain_uq
  on public.worldz_fullscope_tokens(chain_key, upper(symbol));
create unique index if not exists worldz_fullscope_token_contract_chain_uq
  on public.worldz_fullscope_tokens(chain_key, lower(contract_address))
  where contract_address is not null and contract_address <> '';

create or replace function public.worldz_fullscope_enforce_token_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  slot_count integer;
begin
  if new.enabled is not true then return new; end if;
  if tg_op = 'UPDATE' then
    select count(*) into slot_count
    from public.worldz_fullscope_tokens
    where chain_key = new.chain_key and enabled is true and id <> new.id;
  else
    select count(*) into slot_count
    from public.worldz_fullscope_tokens
    where chain_key = new.chain_key and enabled is true;
  end if;
  if slot_count >= 20 then
    raise exception 'WorldzFullScope capacity reached for chain %: maximum 20 enabled tokens', new.chain_key;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_worldz_fullscope_token_capacity on public.worldz_fullscope_tokens;
create trigger trg_worldz_fullscope_token_capacity
before insert or update of chain_key, enabled
on public.worldz_fullscope_tokens
for each row execute function public.worldz_fullscope_enforce_token_capacity();

-- Organic popularity only. This table NEVER decides or executes governance.
create table if not exists public.worldz_popularity_votes (
  id bigserial primary key,
  token_id uuid not null references public.worldz_fullscope_tokens(id) on delete cascade,
  telegram_id bigint not null,
  voted_on date not null default (timezone('utc', now()))::date,
  verification_state text not null default 'telegram' check (verification_state in ('telegram','verified_member')),
  created_at timestamptz not null default now(),
  unique(token_id, telegram_id, voted_on)
);

-- Paid/promoted exposure is recorded separately and is NEVER counted as an organic community vote.
create table if not exists public.worldz_popularity_sponsored_boosts (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id) on delete cascade,
  sponsor_label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','active','ended','cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create or replace view public.worldz_popularity_leaderboard as
select
  t.id as token_id,
  t.chain_key,
  t.name,
  t.symbol,
  t.status,
  count(v.id) filter (where v.created_at >= now() - interval '1 hour')::bigint as votes_1h,
  count(v.id) filter (where v.created_at >= now() - interval '24 hours')::bigint as votes_24h,
  count(v.id) filter (where v.created_at >= now() - interval '7 days')::bigint as votes_7d,
  count(v.id)::bigint as votes_all_time
from public.worldz_fullscope_tokens t
left join public.worldz_popularity_votes v on v.token_id = t.id
where t.enabled is true
group by t.id, t.chain_key, t.name, t.symbol, t.status;

-- Normalized read/event layer for watch, buy/sell reports, liquidity, locks, vesting and proof.
create table if not exists public.worldz_fullscope_events (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.worldz_fullscope_tokens(id) on delete set null,
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  event_type text not null check (event_type in ('price','buy','sell','transfer','holder','liquidity','fee','lock','vesting','proof','security','rpc_health')),
  tx_reference text,
  block_reference text,
  actor_address text,
  amount_raw text,
  quote_value numeric,
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists worldz_fullscope_events_token_observed_idx
  on public.worldz_fullscope_events(token_id, observed_at desc);
create index if not exists worldz_fullscope_events_chain_observed_idx
  on public.worldz_fullscope_events(chain_key, observed_at desc);

-- Financial actions are intents first. The DB stores no seed phrase/private key and cannot silently broadcast.
create table if not exists public.worldz_fullscope_action_intents (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  action_type text not null check (action_type in ('buy','sell','invest','add_liquidity','remove_liquidity','lock','vest','claim')),
  requested_by_telegram_id bigint,
  state text not null default 'prepared' check (state in ('prepared','simulated','approved','signed','broadcast','confirmed','failed','cancelled')),
  requires_external_signature boolean not null default true check (requires_external_signature is true),
  auto_broadcast boolean not null default false check (auto_broadcast is false),
  mainnet_execution_enabled boolean not null default false,
  transaction_payload jsonb not null default '{}'::jsonb,
  proof_receipt jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worldz_fullscope_locks (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  lock_kind text not null check (lock_kind in ('token','liquidity','treasury','team','community','legacy')),
  locker_reference text,
  amount_raw text,
  permanent boolean not null default false,
  starts_at timestamptz,
  unlocks_at timestamptz,
  status text not null default 'planned' check (status in ('planned','prepared','confirmed','released','failed')),
  proof_receipt jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.worldz_fullscope_vesting (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  recipient_address text not null,
  total_amount_raw text not null,
  schedule_kind text not null check (schedule_kind in ('linear','periodic','milestone')),
  initial_unlock_bps integer not null default 0 check (initial_unlock_bps between 0 and 10000),
  starts_at timestamptz not null,
  cliff_at timestamptz,
  ends_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','prepared','active','complete','cancelled','failed')),
  proof_receipt jsonb,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Initial Worldz registry. Planned tokens are labelled as planned and are not represented as live contracts.
insert into public.worldz_fullscope_tokens (chain_key,name,symbol,contract_address,decimals,status,metadata)
values
  ('solana','WORLDZ','WLDZ','AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U',6,'live','{"source":"Worldz canonical registry"}'::jsonb),
  ('solana','REVIVE','RVIV','DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R',6,'prepared','{"source":"REVIVE canonical existing mint","publicLaunch":false}'::jsonb),
  ('solana','PHENIX','PNEX',null,null,'planned','{"supplyTarget":"250000000"}'::jsonb),
  ('solana','MIRACLE','MRCL',null,null,'planned','{"supplyTarget":"348000000"}'::jsonb)
on conflict (chain_key, upper(symbol)) do update
set
  name=excluded.name,
  contract_address=coalesce(excluded.contract_address, public.worldz_fullscope_tokens.contract_address),
  decimals=coalesce(excluded.decimals, public.worldz_fullscope_tokens.decimals),
  status=excluded.status,
  metadata=public.worldz_fullscope_tokens.metadata || excluded.metadata,
  updated_at=now();

alter table public.worldz_fullscope_chains enable row level security;
alter table public.worldz_fullscope_tokens enable row level security;
alter table public.worldz_popularity_votes enable row level security;
alter table public.worldz_popularity_sponsored_boosts enable row level security;
alter table public.worldz_fullscope_events enable row level security;
alter table public.worldz_fullscope_action_intents enable row level security;
alter table public.worldz_fullscope_locks enable row level security;
alter table public.worldz_fullscope_vesting enable row level security;

revoke all on public.worldz_fullscope_chains, public.worldz_fullscope_tokens,
  public.worldz_popularity_votes, public.worldz_popularity_sponsored_boosts,
  public.worldz_fullscope_events, public.worldz_fullscope_action_intents,
  public.worldz_fullscope_locks, public.worldz_fullscope_vesting
from anon, authenticated;

grant all on public.worldz_fullscope_chains, public.worldz_fullscope_tokens,
  public.worldz_popularity_votes, public.worldz_popularity_sponsored_boosts,
  public.worldz_fullscope_events, public.worldz_fullscope_action_intents,
  public.worldz_fullscope_locks, public.worldz_fullscope_vesting
to service_role;
grant select on public.worldz_popularity_leaderboard to service_role;
grant usage, select on sequence public.worldz_popularity_votes_id_seq to service_role;

comment on table public.worldz_popularity_votes is
  'Worldz Votes Centre™ organic popularity votes only. Must never be used to authorize WorldzGovern™ actions.';
comment on table public.governance_votes is
  'WorldzGovern™ DAO/governance votes. Must never be counted in Worldz Votes Centre™ popularity rankings.';
