# Registry Guide

The website reads four public, RLS-protected tables in the existing CryptoWorldz-Bot Supabase project.

## ecosystem_worlds

Controls blockchain identity, public visibility, active status and display order.

Current live registry state: 11 public World records, including CryptoWorldz, SolWorldz, EthWorldz, BaseWorldz, BNBWorldz, XRPWorldz, SuiWorldz, HyperWorldz, RobinWorldz, BitcoinWorldz and HodlerWorldz.

## impact_projects

Stores ImpactBased-approved projects, public descriptions, project `status`, launch model and Board links.

The current database column is `status`, not `launch_status`.

## ecosystem_tokens

Stores planned and launched tokens. Contract addresses may remain empty while `launch_status` is `planned`, `preparing` or `approved`. A contract address is required before `launching` or `live` status.

Important launch disclosure fields:

- `contract_address`
- `pair_address`
- `launch_model`
- `launch_url`
- `dexscreener_url`
- `trade_url`
- `initial_creator_buy`
- `disclosed_creator_supply_pct`
- `fee_total_bps`
- `fee_split`
- `real_liquidity_amount`
- `liquidity_lock_url`
- `verified_at`

Purple Diamond Crew only displays records where `launch_status = live`, `contract_address` is present and `verified_at` is present.

## launch_updates

Stores public launch notices and transaction references for Zed and the websites.

## Public access and security

All four tables have RLS enabled. The `anon` and `authenticated` roles have `SELECT` only. The public browser app uses the Supabase publishable key and cannot insert, update or delete registry records.

Registry changes must be made through a secure admin service using server-side credentials or a future authenticated admin panel with strict authorization.
