# Registry Guide

The website reads four public, RLS-protected tables in the existing CryptoWorldz-Bot Supabase project.

## ecosystem_worlds

Controls domains, blockchain identity and display order.

## impact_projects

Stores ImpactBased-approved projects, public descriptions, launch status and Board links.

## ecosystem_tokens

Stores planned and launched tokens. Contract addresses may remain empty while status is `planned`, `preparing` or `approved`. A contract address is required before `launching` or `live` status.

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

## launch_updates

Stores public launch notices and transaction references for Zed and the websites.

## Write access

The public browser app has read access only. Registry changes must be made through a secure admin service using server-side credentials or a future authenticated admin panel with strict authorization.
