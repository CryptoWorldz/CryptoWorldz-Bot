# Registry Guide

The website reads four public, RLS-protected tables in the existing CryptoWorldz-Bot Supabase project.

## ecosystem_worlds

Controls blockchain identity, public visibility, active status and display order.

Current registry state: 11 public World records, including CryptoWorldz, SolWorldz, EthWorldz, BaseWorldz, BNBWorldz, XRPWorldz, SuiWorldz, HyperWorldz, RobinWorldz, BitcoinWorldz and HodlerWorldz.

## impact_projects

Stores ImpactBased-approved projects, public descriptions, project `status`, launch model and Board links.

The current database column is `status`, not `launch_status`.

## ecosystem_tokens

Stores planned and launched tokens. Contract addresses may remain empty while `launch_status` is `planned`, `preparing` or `approved`.

Important fields:

- `world_id`
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

## Live publication rules

The database requires a live token to have:

- A non-empty contract address
- A verification timestamp
- At least one DEX Screener URL, pair address or trade URL

Purple Diamond Crew additionally displays only records where:

- `launch_status = live`
- `is_public = true`
- `contract_address` is present
- `verified_at` is present

A unique index prevents the same contract address from being entered twice on the same chain. Update triggers automatically maintain `updated_at` using `clock_timestamp()`.

## launch_updates

Stores public launch notices and transaction references for Zed and the websites.

## Public access and security

All four tables have RLS enabled. The `anon` and `authenticated` roles have `SELECT` only. The public browser app uses the Supabase publishable key and cannot insert, update or delete registry records.

Registry changes must be made through secure server-side access. Never place service-role credentials, wallet private keys or recovery phrases in public files or token metadata.
