# Live Token Intake

This is the only remaining content input required before the current website package is deployment-ready with the previously launched ecosystem tokens.

## Minimum information per token

- Token name
- Ticker / symbol
- Blockchain or World
- Contract address
- One official launch, trade or DEX page
- Short project purpose

## Add when available

- DEX Screener URL
- Pair address
- Launch provider and launch model
- Explorer URL
- GeckoTerminal URL
- Project website
- X profile
- Telegram link
- Facebook, YouTube or TikTok links
- Logo URL
- Creator initial buy
- Creator supply percentage
- Total trading fee and fee split
- Added liquidity and lock reference

## Registry mapping

Core fields are stored directly in `ecosystem_tokens`.

Social and project links use the `metadata` object:

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

A token is shown on PurpleDiamondCrew.com only when:

1. `launch_status` is `live`.
2. A non-empty contract address is recorded.
3. A verification timestamp is recorded.
4. A DEX Screener URL, pair address or trade URL is recorded.
5. The record is marked public.

The database prevents duplicate contract addresses on the same chain and automatically updates the record modification timestamp.

## Safety

Never provide or store wallet private keys, seed phrases, recovery phrases, passwords or service-role credentials. Only public token and project information belongs in this registry.
