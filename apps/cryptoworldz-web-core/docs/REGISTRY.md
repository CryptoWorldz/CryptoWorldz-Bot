# Registry Guide

The website reads four public, RLS-protected tables in the existing CryptoWorldz-Bot Supabase project.

## ecosystem_worlds

Controls blockchain identity, public visibility, active status and display order.

Current registry state: 11 public World records, including CryptoWorldz, SolWorldz, EthWorldz, BaseWorldz, BNBWorldz, XRPWorldz, SuiWorldz, HyperWorldz, RobinWorldz, BitcoinWorldz and HodlerWorldz.

## impact_projects

Stores approved projects, public descriptions, project `status`, launch model, website and Board links.

Current public projects include ImpactBased and Purple Diamond Crew. The database column is `status`, not `launch_status`.

## ecosystem_tokens

Stores planned, current and historical tokens. Contract addresses may remain empty while `launch_status` is `planned`, `preparing` or `approved`.

Important fields:

- `world_id`
- `project_id`
- `name`
- `symbol`
- `description`
- `chain_id`
- `contract_address`
- `pair_address`
- `launch_status`
- `launch_provider`
- `launch_model`
- `launch_url`
- `dex_name`
- `trade_url`
- `dexscreener_url`
- `geckoterminal_url`
- `explorer_url`
- `logo_url`
- `initial_creator_buy`
- `initial_creator_buy_currency`
- `disclosed_creator_supply_pct`
- `fee_total_bps`
- `fee_split`
- `real_liquidity_amount`
- `real_liquidity_currency`
- `liquidity_lock_url`
- `verified_at`
- `verified_by`
- `is_public`
- `is_featured`
- `display_order`
- `metadata`

Supported social metadata keys:

```json
{
  "website_url": "https://...",
  "x_url": "https://x.com/...",
  "telegram_url": "https://t.me/...",
  "facebook_url": "https://...",
  "youtube_url": "https://...",
  "tiktok_url": "https://...",
  "purpose": "Short public project purpose"
}
```

## Publication rules

The database requires a token marked `live` to have:

- A non-empty contract address
- A verification timestamp
- At least one DEX Screener URL, pair address or trade URL

The dedicated Purple Diamond Crew register displays verified project records with these statuses:

- `live`
- `paused`
- `archived`

Every displayed Purple Diamond Crew record must also have:

- `project_id` connected to the `purple-diamond-crew` project
- `is_public = true`
- A non-empty `contract_address`
- A non-empty `verified_at`

Paused and archived records are explicitly labelled as historical. Verified existence and project association do not imply current liquidity or tradability.

A unique index prevents the same contract address from being entered twice on the same chain. Update triggers automatically maintain `updated_at` using `clock_timestamp()`.

## Current Purple Diamond Crew state

- 10 verified unique token records
- 5 paused / historical
- 5 archived
- All 10 use `https://purplediamondcrew.com`
- All 10 use `https://x.com/PDCrew`
- All 10 use `https://t.me/PurpleDiamondCrew`

The detailed register is recorded in `PDC-TOKEN-REGISTER.md`.

## launch_updates

Stores public launch notices and transaction references for Zed and the websites.

## Public access and security

All four tables have RLS enabled. The `anon` and `authenticated` roles have `SELECT` only. The public browser app uses the Supabase publishable key and cannot insert, update or delete registry records.

Registry changes must be made through secure server-side access. Never place service-role credentials, wallet private keys, recovery phrases, phone numbers or account-transfer credentials in public files or token metadata.
