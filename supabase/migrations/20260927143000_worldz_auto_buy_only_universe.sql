-- Worldz AUTO Buy-Only™ universe.
-- Owner-funded SOL accumulation only. Additive and disabled by default.
-- No private key, seed phrase, sell automation, randomized execution or automatic enablement.

alter table public.auto_dca_settings
  add column if not exists allowed_input_currency text not null default 'SOL',
  add column if not exists max_buys_per_day integer not null default 6,
  add column if not exists amount_presets jsonb not null default '[0.005,0.01,0.02,0.05,0.1]'::jsonb,
  add column if not exists weekly_budget_aud_cents integer not null default 0,
  add column if not exists buy_only boolean not null default true,
  add column if not exists multiwallet_enabled boolean not null default true,
  add column if not exists randomized_execution boolean not null default false,
  add column if not exists auto_enroll_worldz_tokens boolean not null default true;

update public.auto_dca_settings
set allowed_input_currency = 'SOL',
    buy_only = true,
    multiwallet_enabled = true,
    randomized_execution = false,
    auto_enroll_worldz_tokens = true,
    execution_enabled = false,
    paused = true,
    emergency_stop = true,
    updated_at = now()
where id = 1;

create table if not exists public.auto_dca_wallets (
  wallet_address text primary key check (char_length(wallet_address) between 32 and 44),
  label text not null check (char_length(label) between 1 and 120),
  wallet_role text not null check (wallet_role in ('owner','dev')),
  enabled boolean not null default false,
  verified boolean not null default false,
  added_by bigint,
  verified_by bigint,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auto_dca_schedules
  add column if not exists wallet_address text;

create index if not exists auto_dca_schedules_wallet_idx
  on public.auto_dca_schedules(wallet_address, status, next_run_at);

alter table public.auto_tokens
  add column if not exists source_kind text not null default 'manual',
  add column if not exists source_token_id uuid,
  add column if not exists inherited_buy_only boolean not null default false,
  add column if not exists auto_buy_enabled boolean not null default false;

create table if not exists public.auto_worldz_asset_registry (
  id uuid primary key default gen_random_uuid(),
  chain_key text not null,
  source_token_id uuid,
  name text not null,
  symbol text not null,
  contract_address text,
  source_kind text not null check (source_kind in ('legacy','canonical','worldzlaunchpad')),
  buy_policy text not null default 'BUY_ONLY' check (buy_policy = 'BUY_ONLY'),
  funding_asset text not null default 'SOL' check (funding_asset = 'SOL'),
  execution_state text not null default 'ADAPTER_GATED'
    check (execution_state in ('SOLANA_ELIGIBLE','PENDING_REAL_CONTRACT','ADAPTER_GATED','DISABLED')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists auto_worldz_asset_registry_source_token_uq
  on public.auto_worldz_asset_registry(source_token_id)
  where source_token_id is not null;

create unique index if not exists auto_worldz_asset_registry_contract_uq
  on public.auto_worldz_asset_registry(chain_key, lower(contract_address))
  where contract_address is not null and contract_address <> '';

alter table public.auto_dca_wallets enable row level security;
alter table public.auto_worldz_asset_registry enable row level security;
revoke all on public.auto_dca_wallets, public.auto_worldz_asset_registry from anon, authenticated;
grant all on public.auto_dca_wallets, public.auto_worldz_asset_registry to service_role;

-- Preserve a previously configured primary owner wallet as a registry entry, but do not
-- infer verification for a new/unconfirmed wallet.
insert into public.auto_dca_wallets (wallet_address,label,wallet_role,enabled,verified,added_by)
select wallet_address, 'Primary Owner AUTO Wallet', 'owner', true, true, updated_by
from public.auto_dca_settings
where id = 1 and wallet_address is not null
on conflict (wallet_address) do nothing;

-- Exact verified 10-token Purple Diamond legacy universe.
with legacy(name,symbol,mint) as (
  values
    ('Purple Diamond Crew','PDC','F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump'),
    ('The Purple Diamond Crew','PDC1','PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw'),
    ('Purple Diamond Crew','PDC1','PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52'),
    ('Purple Diamond Crew – MAGA Edition','PDCMAGA','7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump'),
    ('PurpleDiamondCrewShares','PDCshare','PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE'),
    ('Purple Diamond Crew','PurpleDC','9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf'),
    ('OG Purple Diamond','PurpleOg','DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump'),
    ('Purple Diamond Crew – PCC1 Legacy','PDC1','DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv'),
    ('INVEST','INVEST','VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC'),
    ('Limited Edition','LMTD','Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY')
)
insert into public.auto_tokens (network,token_mint,symbol,display_name,status,source_kind,inherited_buy_only,auto_buy_enabled)
select 'solana',mint,symbol,name,'allowlisted','legacy',true,true from legacy
on conflict (network,token_mint) do update
set symbol=excluded.symbol,
    display_name=excluded.display_name,
    status='allowlisted',
    source_kind='legacy',
    inherited_buy_only=true,
    auto_buy_enabled=true,
    updated_at=now();

with legacy(name,symbol,mint) as (
  values
    ('Purple Diamond Crew','PDC','F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump'),
    ('The Purple Diamond Crew','PDC1','PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw'),
    ('Purple Diamond Crew','PDC1','PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52'),
    ('Purple Diamond Crew – MAGA Edition','PDCMAGA','7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump'),
    ('PurpleDiamondCrewShares','PDCshare','PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE'),
    ('Purple Diamond Crew','PurpleDC','9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf'),
    ('OG Purple Diamond','PurpleOg','DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump'),
    ('Purple Diamond Crew – PCC1 Legacy','PDC1','DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv'),
    ('INVEST','INVEST','VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC'),
    ('Limited Edition','LMTD','Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY')
)
insert into public.auto_worldz_asset_registry
  (chain_key,name,symbol,contract_address,source_kind,buy_policy,funding_asset,execution_state)
select 'solana',name,symbol,mint,'legacy','BUY_ONLY','SOL','SOLANA_ELIGIBLE' from legacy
on conflict (chain_key, lower(contract_address)) where contract_address is not null and contract_address <> ''
do update set
  name=excluded.name, symbol=excluded.symbol, source_kind='legacy',
  buy_policy='BUY_ONLY', funding_asset='SOL', execution_state='SOLANA_ELIGIBLE',
  enabled=true, updated_at=now();

-- Canonical Worldz tokens with real Solana mints are immediately registered.
with canonical(name,symbol,mint) as (
  values
    ('WORLDZ','WLDZ','AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U'),
    ('REVIVE','RVIV','DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R')
)
insert into public.auto_tokens (network,token_mint,symbol,display_name,status,source_kind,inherited_buy_only,auto_buy_enabled)
select 'solana',mint,symbol,name,'allowlisted','canonical',true,true from canonical
on conflict (network,token_mint) do update
set symbol=excluded.symbol, display_name=excluded.display_name, status='allowlisted',
    source_kind='canonical', inherited_buy_only=true, auto_buy_enabled=true, updated_at=now();

-- PHENIX and MIRACLE are tracked without inventing mints.
insert into public.auto_worldz_asset_registry
  (chain_key,name,symbol,contract_address,source_kind,buy_policy,funding_asset,execution_state)
values
  ('solana','PHENIX','PNEX',null,'canonical','BUY_ONLY','SOL','PENDING_REAL_CONTRACT'),
  ('solana','MIRACLE','MRCL',null,'canonical','BUY_ONLY','SOL','PENDING_REAL_CONTRACT')
on conflict do nothing;

create or replace function public.sync_worldzlaunchpad_auto_buy_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auto_worldz_asset_registry
    (chain_key,source_token_id,name,symbol,contract_address,source_kind,buy_policy,funding_asset,execution_state,enabled,updated_at)
  values (
    new.chain_key,new.id,new.name,new.symbol,new.contract_address,'worldzlaunchpad','BUY_ONLY','SOL',
    case
      when new.contract_address is null or new.contract_address = '' then 'PENDING_REAL_CONTRACT'
      when new.chain_key = 'solana' then 'SOLANA_ELIGIBLE'
      else 'ADAPTER_GATED'
    end,
    new.enabled,now()
  )
  on conflict (source_token_id) where source_token_id is not null
  do update set
    chain_key=excluded.chain_key,name=excluded.name,symbol=excluded.symbol,
    contract_address=excluded.contract_address,buy_policy='BUY_ONLY',funding_asset='SOL',
    execution_state=excluded.execution_state,enabled=excluded.enabled,updated_at=now();

  if new.chain_key = 'solana'
     and new.enabled
     and new.contract_address is not null
     and new.contract_address <> ''
     and new.status in ('prepared','live')
  then
    insert into public.auto_tokens
      (network,token_mint,symbol,display_name,status,source_kind,source_token_id,inherited_buy_only,auto_buy_enabled)
    values
      ('solana',new.contract_address,new.symbol,new.name,'allowlisted','worldzlaunchpad',new.id,true,true)
    on conflict (network,token_mint) do update
    set symbol=excluded.symbol,display_name=excluded.display_name,status='allowlisted',
        source_kind='worldzlaunchpad',source_token_id=new.id,
        inherited_buy_only=true,auto_buy_enabled=true,updated_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_worldzlaunchpad_auto_buy_token on public.worldz_fullscope_tokens;
create trigger trg_worldzlaunchpad_auto_buy_token
after insert or update of chain_key,name,symbol,contract_address,status,enabled
on public.worldz_fullscope_tokens
for each row execute function public.sync_worldzlaunchpad_auto_buy_token();

-- Backfill the current FullScope registry through the same inheritance policy.
insert into public.auto_worldz_asset_registry
  (chain_key,source_token_id,name,symbol,contract_address,source_kind,buy_policy,funding_asset,execution_state,enabled)
select
  chain_key,id,name,symbol,contract_address,'worldzlaunchpad','BUY_ONLY','SOL',
  case
    when contract_address is null or contract_address = '' then 'PENDING_REAL_CONTRACT'
    when chain_key = 'solana' then 'SOLANA_ELIGIBLE'
    else 'ADAPTER_GATED'
  end,
  enabled
from public.worldz_fullscope_tokens
on conflict (source_token_id) where source_token_id is not null
do update set
  name=excluded.name,symbol=excluded.symbol,contract_address=excluded.contract_address,
  execution_state=excluded.execution_state,enabled=excluded.enabled,updated_at=now();

create or replace function public.claim_auto_dca_schedule(p_worker_id text)
returns setof public.auto_dca_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.auto_dca_schedules%rowtype;
  settings public.auto_dca_settings%rowtype;
  v_day_start timestamptz := date_trunc('day', timezone('Australia/Sydney', now())) at time zone 'Australia/Sydney';
  v_week_start timestamptz := date_trunc('week', timezone('Australia/Sydney', now())) at time zone 'Australia/Sydney';
  v_today_count integer := 0;
  v_today_spent numeric := 0;
  v_week_spent numeric := 0;
begin
  if p_worker_id is null or char_length(trim(p_worker_id)) < 3 then return; end if;

  select * into settings from public.auto_dca_settings where id = 1 for update;
  if not found
     or not settings.enabled
     or not settings.execution_enabled
     or settings.paused
     or settings.emergency_stop
     or not settings.buy_only
     or settings.randomized_execution
  then return; end if;

  select
    count(*) filter (where started_at >= v_day_start)::integer,
    coalesce(sum(input_amount) filter (where started_at >= v_day_start), 0),
    coalesce(sum(input_amount) filter (where started_at >= v_week_start), 0)
  into v_today_count,v_today_spent,v_week_spent
  from public.auto_dca_executions
  where status='success';

  if v_today_count >= settings.max_buys_per_day
     or settings.max_daily_amount <= 0
     or settings.max_weekly_amount <= 0
     or v_today_spent >= settings.max_daily_amount
     or v_week_spent >= settings.max_weekly_amount
  then return; end if;

  select s.* into claimed
  from public.auto_dca_schedules s
  join public.auto_dca_wallets w on w.wallet_address = coalesce(s.wallet_address, settings.wallet_address)
  join public.auto_tokens t on t.network='solana' and t.token_mint=s.token_mint
  where s.status='active'
    and s.input_currency=settings.allowed_input_currency
    and s.amount_per_buy <= settings.max_order_amount
    and v_today_spent + s.amount_per_buy <= settings.max_daily_amount
    and v_week_spent + s.amount_per_buy <= settings.max_weekly_amount
    and s.completed_buys < s.order_count
    and s.next_run_at is not null and s.next_run_at <= now()
    and (s.locked_until is null or s.locked_until < now())
    and w.enabled and w.verified and w.wallet_role in ('owner','dev')
    and t.status='allowlisted' and t.inherited_buy_only and t.auto_buy_enabled
  order by s.next_run_at asc,s.created_at asc
  for update of s skip locked
  limit 1;

  if not found then return; end if;

  update public.auto_dca_schedules
  set locked_by=p_worker_id,
      locked_until=now()+interval '2 minutes',
      started_at=coalesce(started_at,now()),
      updated_at=now()
  where id=claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;

revoke all on function public.claim_auto_dca_schedule(text) from public, anon, authenticated;
grant execute on function public.claim_auto_dca_schedule(text) to service_role;

comment on table public.auto_dca_wallets is
  'Explicit owner/dev public-wallet allowlist for Worldz AUTO. No seed phrase/private key is stored.';
comment on table public.auto_worldz_asset_registry is
  'Every legacy, canonical and inherited WorldzLaunchPad asset is tracked as BUY_ONLY. Non-Solana assets remain adapter-gated until an approved SOL-funded route exists.';
