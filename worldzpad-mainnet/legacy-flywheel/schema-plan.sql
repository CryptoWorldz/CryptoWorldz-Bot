-- WORLDZ LEGACY FLYWHEEL — SCHEMA PLAN ONLY
-- This file is intentionally NOT a live migration.
-- Review, security-test and create a proper Supabase migration before applying.

create table legacy_flywheel_assets (
  legacy_order integer primary key,
  mint text unique not null,
  token_name text not null,
  symbol text not null,
  decimals integer not null,
  minimum_balance_raw numeric not null,
  minimum_policy text not null,
  reward_vault text,
  enabled boolean not null default false
);

create table legacy_flywheel_fee_contributions (
  id uuid primary key default gen_random_uuid(),
  source_chain text not null,
  source_token_mint text not null,
  source_fee_claim_signature text not null,
  controlled_fee_raw numeric not null,
  flywheel_fee_raw numeric not null,
  accounting_asset text not null,
  epoch_start timestamptz not null,
  created_at timestamptz not null default now(),
  unique(source_chain, source_fee_claim_signature)
);

create table legacy_flywheel_epochs (
  id uuid primary key default gen_random_uuid(),
  legacy_order integer not null references legacy_flywheel_assets(legacy_order),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  funded_lamports numeric not null default 0,
  eligible_wallets integer not null default 0,
  status text not null default 'PLANNED',
  proof jsonb not null default '{}'::jsonb,
  unique(legacy_order, starts_at)
);

create table legacy_flywheel_entitlements (
  epoch_id uuid not null references legacy_flywheel_epochs(id),
  owner_wallet text not null,
  start_balance_raw numeric not null,
  end_balance_raw numeric not null,
  qualifying_balance_raw numeric not null,
  equal_weight numeric not null,
  sqrt_weight numeric not null,
  reward_lamports numeric not null,
  claim_status text not null default 'UNCLAIMED',
  claim_signature text,
  claimed_at timestamptz,
  primary key(epoch_id, owner_wallet)
);

-- SECURITY REQUIREMENT:
-- Keep these tables private/service-role-only until explicit RLS policies,
-- claim verification and authorization are reviewed.
