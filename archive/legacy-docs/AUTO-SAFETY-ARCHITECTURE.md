# Diamond Buy™ Auto — SAFE LOCKED Architecture

## Purpose

Auto is prepared as an owner-controlled planning and simulation service for future transparent treasury purchase schedules.

This release is **not a trading bot**. It does not build, sign, schedule for execution or submit blockchain transactions.

## Service separation

### Zed Command Centre

- Telegram identity and owner verification.
- Owner commands and Mini App controls.
- No Auto database writes directly.
- No wallet signing authority.
- Private authenticated calls to Auto.

### Auto service

- Separate Node entrypoint: `auto-server.js`.
- Separate Hostinger service recommended.
- Separate environment and rollback.
- Reads server-only Auto tables.
- Validates and stores simulations.
- Provides pause, simulation resume and emergency-stop controls.
- Contains no transaction endpoint.

### Supabase

- Additive SAFE LOCKED tables.
- No public grants.
- RLS enabled.
- No token allowlist by default.
- All financial limits default to zero.
- Execution and signing constrained false.
- Transaction signatures, signed payloads and private-key references constrained null.

## Owner authentication

Every protected Auto request requires both:

1. A strong private `AUTO_INTERNAL_TOKEN` shared only between Zed and Auto.
2. The exact configured `OWNER_TELEGRAM_ID`.

Mini App calls first validate Telegram-signed `initData` with the Zed bot token. The browser never receives the Auto service token or Supabase service-role key.

## Owner commands

| Command | Result |
|---|---|
| `/auto` | Show current SAFE LOCKED status |
| `/autosimulate` | Validate and record a proposal only |
| `/autopause` | Pause simulations |
| `/autoresume` | Resume simulation mode only |
| `/autoemergency` | Pause and set emergency stop |

These commands are not in the public Telegram command list.

## Validation rules

A simulation must pass all of the following:

- Supported network: Solana only in this release.
- Valid Solana token mint.
- Token is owner-allowlisted.
- Currency is SOL or USDC.
- Positive amount.
- 1–365 simulated orders.
- Interval meets the minimum.
- Slippage is at or below the configured cap.
- Price impact is at or below the configured cap.
- Observed liquidity is at or above the configured minimum.
- Per-order cap is non-zero and not exceeded.
- Daily, weekly and monthly caps are non-zero and not exceeded.

Default caps are zero, so every proposal is rejected until the owner deliberately configures simulation limits.

## Explicitly absent

The source tree and CI workflow prohibit known transaction and signing primitives, including:

- `sendTransaction`
- `sendRawTransaction`
- `signTransaction`
- secret-key keypair construction
- wallet submission methods

The service configuration rejects:

- Live mode.
- Execution enabled.
- Wallet private key.
- Wallet seed.
- Signer secret.

## Governance boundary

Governance may discuss ecosystem policy and transparency standards.

Governance cannot:

- Allowlist a token.
- Set Auto limits.
- Change the private service token.
- Add a signing wallet.
- Pause or resume Auto.
- Approve treasury execution.

## Future live-execution gate

No future live execution should be added by simply changing an environment variable. A transaction-capable version requires a separate branch and approval package covering:

- Legal and market-integrity review.
- Custody and key-management design.
- Network-specific transaction construction.
- Token-specific allowlisting.
- Independent security review.
- Spend policy and accounting.
- Incident response.
- Separate owner approval for each token and budget.

That work is outside the current master deployment approval.
