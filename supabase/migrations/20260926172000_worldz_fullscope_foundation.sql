-- WorldzFullScope™ foundation
-- Popularity voting and DAO governance remain separate.
create extension if not exists pgcrypto;

create table if not exists public.worldz_fullscope_chains (
  chain_key text primary key,
  label text not null,
  family text not null,
  enabled boolean not null default true,
  max_tokens integer not null default 20 check (max_tokens = 20),
  mainnet_execution_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.worldz_fullscope_chains (chain_key,label,family) values
('solana','Solana','solana'),('xrpl','XRP Ledger','xrpl'),('base','Base','evm'),
('ethereum','Ethereum','evm'),('bnb','BNB Smart Chain','evm'),('sui','Sui','sui'),
('hyperevm','HyperEVM','evm'),('robinhood','Robinhood Chain','evm')
on conflict (chain_key) do update set label=excluded.label,family=excluded.family,max_tokens=20;

create table if not exists public.worldz_fullscope_tokens (
  id uuid primary key default gen_random_uuid(),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  name text not null,
  symbol text not null,
  contract_address text,
  decimals integer,
  status text not null default 'planned',
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists worldz_fullscope_token_symbol_chain_uq on public.worldz_fullscope_tokens(chain_key,upper(symbol));

create or replace function public.worldz_fullscope_enforce_token_capacity()
returns trigger language plpgsql security definer set search_path=public as $$
declare slot_count integer;
begin
  select count(*) into slot_count from public.worldz_fullscope_tokens
  where chain_key=new.chain_key and enabled is true and (tg_op='INSERT' or id<>new.id);
  if new.enabled is true and slot_count >= 20 then
    raise exception 'WorldzFullScope capacity reached: maximum 20 enabled tokens';
  end if;
  return new;
end; $$;
drop trigger if exists trg_worldz_fullscope_token_capacity on public.worldz_fullscope_tokens;
create trigger trg_worldz_fullscope_token_capacity before insert or update on public.worldz_fullscope_tokens
for each row execute function public.worldz_fullscope_enforce_token_capacity();

create table if not exists public.worldz_popularity_votes (
  id bigserial primary key,
  token_id uuid not null references public.worldz_fullscope_tokens(id) on delete cascade,
  telegram_id bigint not null,
  voted_on date not null default (timezone('utc',now()))::date,
  created_at timestamptz not null default now(),
  unique(token_id,telegram_id,voted_on)
);

create table if not exists public.worldz_popularity_sponsored_boosts (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id) on delete cascade,
  sponsor_label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create or replace view public.worldz_popularity_leaderboard as
select t.id token_id,t.chain_key,t.name,t.symbol,t.status,
count(v.id) filter(where v.created_at>=now()-interval '1 hour')::bigint votes_1h,
count(v.id) filter(where v.created_at>=now()-interval '24 hours')::bigint votes_24h,
count(v.id) filter(where v.created_at>=now()-interval '7 days')::bigint votes_7d,
count(v.id)::bigint votes_all_time
from public.worldz_fullscope_tokens t left join public.worldz_popularity_votes v on v.token_id=t.id
where t.enabled is true group by t.id,t.chain_key,t.name,t.symbol,t.status;

create table if not exists public.worldz_fullscope_events (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.worldz_fullscope_tokens(id) on delete set null,
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  event_type text not null,
  tx_reference text,
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now()
);

-- Prepared action records are non-custodial and cannot self-broadcast.
create table if not exists public.worldz_fullscope_action_intents (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  action_type text not null,
  state text not null default 'prepared',
  requires_external_signature boolean not null default true check (requires_external_signature is true),
  auto_broadcast boolean not null default false check (auto_broadcast is false),
  mainnet_execution_enabled boolean not null default false,
  proof_receipt jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.worldz_fullscope_locks (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  lock_kind text not null,
  status text not null default 'planned',
  proof_receipt jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.worldz_fullscope_vesting (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.worldz_fullscope_tokens(id),
  chain_key text not null references public.worldz_fullscope_chains(chain_key),
  recipient_address text not null,
  schedule_kind text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'planned',
  proof_receipt jsonb,
  created_at timestamptz not null default now()
);

insert into public.worldz_fullscope_tokens (chain_key,name,symbol,contract_address,decimals,status,metadata) values
('solana','WORLDZ','WLDZ','AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U',6,'live','{"source":"canonical registry"}'),
('solana','REVIVE','RVIV','DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R',6,'live','{"source":"canonical registry"}'),
('solana','PHENIX','PNEX',null,null,'planned','{"supplyTarget":"250000000"}'),
('solana','MIRACLE','MRCL',null,null,'planned','{"supplyTarget":"348000000"}')
on conflict (chain_key,upper(symbol)) do update set
name=excluded.name,contract_address=coalesce(excluded.contract_address,public.worldz_fullscope_tokens.contract_address),
decimals=coalesce(excluded.decimals,public.worldz_fullscope_tokens.decimals),status=excluded.status,
metadata=public.worldz_fullscope_tokens.metadata||excluded.metadata,updated_at=now();

alter table public.worldz_fullscope_chains enable row level security;
alter table public.worldz_fullscope_tokens enable row level security;
alter table public.worldz_popularity_votes enable row level security;
alter table public.worldz_popularity_sponsored_boosts enable row level security;
alter table public.worldz_fullscope_events enable row level security;
alter table public.worldz_fullscope_action_intents enable row level security;
alter table public.worldz_fullscope_locks enable row level security;
alter table public.worldz_fullscope_vesting enable row level security;

revoke all on public.worldz_fullscope_chains,public.worldz_fullscope_tokens,public.worldz_popularity_votes,
public.worldz_popularity_sponsored_boosts,public.worldz_fullscope_events,public.worldz_fullscope_action_intents,
public.worldz_fullscope_locks,public.worldz_fullscope_vesting from anon,authenticated;

grant all on public.worldz_fullscope_chains,public.worldz_fullscope_tokens,public.worldz_popularity_votes,
public.worldz_popularity_sponsored_boosts,public.worldz_fullscope_events,public.worldz_fullscope_action_intents,
public.worldz_fullscope_locks,public.worldz_fullscope_vesting to service_role;
grant select on public.worldz_popularity_leaderboard to service_role;

comment on table public.worldz_popularity_votes is
'Worldz Votes Centre™ organic popularity votes only. Must never be used to authorize WorldzGovern™ actions.';
comment on table public.governance_votes is
'WorldzGovern™ DAO/governance votes. Must never be counted in Worldz Votes Centre™ popularity rankings.';
