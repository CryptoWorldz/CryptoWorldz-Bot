# Command Centre Ultimate™ — Foundation Blueprint

Status: Foundation v1
Date: 11 August 2026 (Australia/Sydney)

## Mission

Command Centre Ultimate™ is the owner-controlled operating layer above Zed, Auto and Grace. It plans funding, separates operational purposes, creates approval proposals, records decisions, and hands approved actions to external banking, exchange, Solana and social adapters.

It is deliberately not a password vault, private-key wallet or silent trading engine.

## Permanent safety rules

1. JayJayTeamDev is the immutable Owner signer.
2. Three signers: JayJayTeamDev, Stepper and Remedy.
3. Standard proposals require 2-of-3 approval.
4. Funding-rail changes, wallet changes, token launches, limit changes, signer changes and disabling emergency stop require the Owner plus at least one other signer.
5. Banking passwords, card data, seed phrases, private keys and signed payloads are forbidden from the Command Centre database and request model.
6. Execution starts OFF. Planner mode can run while execution remains locked.
7. Every external action must be idempotent, auditable and attributable to an approved proposal.
8. No wash trading, artificial volume, wallet rotation, stealth-wallet strategies or price/volume-triggered market-support automation.
9. Public token marketing must not promise profit, guaranteed adoption, guaranteed price performance or guaranteed launch success.
10. Every token launch passes an Australian legal-classification gate before launch-ready status.

## Weekday funding planner

Timezone: Australia/Sydney
Schedule: Monday-Friday at 18:30 local time

The planner creates a proposal at the nominated time. The proposal never contains bank credentials and cannot bypass the configured approval policy.

Initial operational split:

| Purpose | Allocation |
|---|---:|
| Treasury | 35% |
| Dev + Grace Operations | 25% |
| Rewards | 20% |
| Owner Diamond Buy™ | 20% |

The four wallet slots are public-address-only records. They remain `pending_address` until a public Solana address is registered through an Owner-approved wallet-change proposal.

## Preferred funding rail

### Primary path

Westpac scheduled payment -> Coinbase Australia AUD balance -> owner-approved USDC conversion -> verified self-custody treasury/multisig -> approved operational allocation -> Jupiter for approved Solana swaps/recurring orders.

Why this path:

- Westpac is the fiat source and schedule authority.
- Coinbase is the fiat/crypto conversion bridge, subject to the capabilities and verification on the actual Australian account.
- Jupiter is the Solana execution venue only after funds are self-custodied and the required transaction is signed.
- PayPal is retained only as an alternate fiat source candidate, not a primary rail.
- Stripe remains for business/payment operations and Grace advertising budgets; it is not the core owner-investment treasury rail.

No automation may bypass Westpac authorisation, Coinbase 2FA/Travel Rule/account checks, wallet signatures or multisig approval.

## MultiSig Wallet Pro™

The Command Centre provides the branded workflow, proposal engine, Telegram approval experience, audit trail, role rules and policy controls.

The underlying Solana signing account should use a mature audited multisig program rather than a newly invented unaudited custody contract. The intended production adapter is Squads Protocol v4 or an equivalently audited Solana multisig after final integration review.

Proposed policy:

- 3 signers
- threshold 2
- permanent Owner: JayJayTeamDev
- high-risk operations must include Owner approval
- each signer uses an independent wallet/key
- no shared seed phrases
- transaction simulation before proposal approval where supported
- spending limits and timelocks enabled where practical
- emergency stop can be turned ON immediately; turning it OFF is a high-risk proposal

## Grace Auto Post™ funding

Grace receives an operating envelope from the `dev_grace_operations` allocation. Grace never receives unrestricted treasury authority.

Controls:

- platform-level monthly budgets
- campaign-level budgets
- Stepper approval workflow
- Owner override/emergency stop
- design -> draft -> approval -> schedule -> publish -> result audit flow
- Meta paid media through approved Meta bridges
- direct social APIs added only where an official publishing path is available

## Auto Diamond Buy™

Owner Diamond Buy™ remains an owner-investment function, not a market-making or artificial-volume function.

Permanent controls:

- buy-only unless a future separately reviewed policy is adopted
- USDC/SOL input only where supported
- token allowlist
- order, daily, weekly and monthly caps
- slippage limit
- price-impact limit
- minimum liquidity rule
- external signer
- no private key in the control service
- no multi-wallet volume strategy
- no randomized activity intended to disguise common control

## Token Launch Engine

### Launch philosophy

The objective is adoption through clarity, utility, transparency and low friction — not high transaction taxes or promises of price appreciation.

Based.bid currently supports launch models plus a Fee Builder that can route dynamic fees, rewards, buybacks and custom wallets. Ultimate imposes a stricter internal fee cap than the platform maximum.

### Ultimate creator-fee profile

- Launch: 1.00% creator fee
- Growth: 0.75% after at least 100 completed trades and healthy liquidity
- Mature: 0.50% after at least 500 completed trades and healthy liquidity
- Internal hard cap: 3.00%
- Fees do not automatically increase because price or liquidity falls
- Any fee change is logged and requires approval

Creator-fee proceeds target:

| Purpose | Share of creator-fee proceeds |
|---|---:|
| Charity / verified impact | 30% |
| Liquidity reserve / approved LP additions | 25% |
| Development | 20% |
| Team | 15% |
| Buyback + burn reserve | 10% |

The buyback + burn reserve is not an automatic price-support bot. Use requires an approved, disclosed proposal. It must not trigger from price, volume or holder behaviour.

The launch screen must separately show any Based.bid/DEX/protocol fees so users see the complete cost rather than only the creator fee.

## First-launch recommendation

The historical Purple Diamond Crew register is valuable as an archive, but the verified register currently labels those ten contracts as paused/historical or archived, and the verification snapshot recorded no current Jupiter route for them.

For the first Ultimate-era launch, use a clean new token rather than recycling a historical mint.

### Working candidate: OneWorldz Kindness — $KIND

Positioning: community participation and impact token for the OneWorldz mission.

Design principles:

- fresh fair launch
- no presale promise
- no guaranteed return or price projection
- no holder yield promised from pooled management
- transparent creator-fee routing
- verified impact reporting for the charity allocation
- community utility can be added progressively through Zed missions, access, participation and recognition
- launch only after the legal gate confirms the final rights/features and marketing are acceptable

$KIND is a working design candidate, not yet a live token or investment recommendation.

## Australian compliance gate

Before any public token launch or third-party treasury service goes live, Ultimate records a legal gate covering at minimum:

1. Digital-asset classification under the Corporations Act/ASIC guidance based on the actual rights, promises and economic arrangement — not merely the token label.
2. Whether any activity constitutes providing financial services or operating a digital asset platform/custody arrangement requiring licensing or authorisation.
3. AUSTRAC/AML-CTF obligations if CryptoWorldz provides regulated virtual-asset services to other people rather than only controlling the Owner's own assets.
4. Coinbase Australia Travel Rule/self-custody verification requirements for external sends.
5. Australian Consumer Law/ASIC advertising controls: no misleading performance, scarcity, safety or return claims.
6. Tax/accounting records for fiat deposits, crypto acquisitions, transfers, fees, rewards, burns, LP additions and disposals.
7. Clear separation between owner funds, project treasury, rewards, charity allocations and third-party/customer assets.

As of this blueprint, the Australian Digital Assets Framework Act 2026 has passed but its new platform regime commences in April 2027. Existing obligations and ASIC's current INFO 225 analysis still matter now.

## Build sequence

### Foundation v1 — implemented first

- Ultimate database control plane
- permanent Owner record
- Stepper + Remedy approver records
- 2-of-3 policy
- high-risk Owner-required policy
- weekday 18:30 Sydney schedule configuration
- four wallet-purpose slots
- funding-rail registry
- proposal + approval + audit tables
- token-launch planning table
- execution OFF + emergency stop ON
- code-level schedule, allocation, approval, secret-rejection and fee-policy tests

### Build 2 — connection adapters

- Westpac schedule/reconciliation adapter (no credential scraping)
- Coinbase account-capability and approved trade/send adapter
- self-custody/Travel Rule verification state
- Squads multisig adapter
- Jupiter recurring/swap adapter
- wallet-address registration flow
- transaction simulation and proposal preview

### Build 3 — Telegram Ultimate UI

Replace long admin lists with gateways:

- ULTIMATE
- TREASURY
- AUTO
- GRACE
- REWARDS
- LAUNCHES
- APPROVALS
- AUDIT
- SETTINGS

Each gateway opens a small button-driven panel rather than another long command list.

### Build 4 — public sites

Publish a factual Command Centre Ultimate™ product page across OneWorldz/CryptoWorldz and the Worldz sites. Public copy describes architecture, security and mission. Investment-performance claims and 'guaranteed' token language are prohibited.

### Build 5 — first Based.bid launch

- legal gate complete
- token rights/features locked
- fees displayed in full
- wallets/multisig registered
- launch parameters simulated
- official media/social assets prepared by Grace
- two-person approval including Owner
- launch and post-launch monitoring

## Definition of success

Ultimate succeeds when routine operations are automated without sacrificing custody security, legal controls, human accountability or truthful public communication. The system should make mistakes difficult, visible and reversible wherever the underlying rail allows reversal — not pretend that financial transactions or smart contracts cannot fail.
