# WorldzFullBuild™ — SOL Working Budget

**Snapshot date:** 2026-09-29  
**Purpose:** planning reserve for upcoming Worldz Solana proof/launch steps. This is **not a required-spend target**. Unused SOL stays in the controlling wallet/treasury.

## Price snapshot used for planning

- SOL reference: approximately **US$118.78**
- USD/AUD reference: **1 USD = 1.42482 AUD**
- Planning conversion: approximately **A$169.24 per SOL**
- MIRACLE creator-first-buy target: **A$200**, approximately **1.18 SOL** at this snapshot.
- **Every real transaction must re-bind live SOL/AUD and venue/network costs at review time.**

## Working reserve target — 10 SOL

| Reserve | SOL | Approx AUD | Purpose |
| --- | ---: | ---: | --- |
| Shared operations / proof buffer | 1.0 | A$169 | rent, normal network fees, priority fees, account creation and proof retries |
| REVIVE $RVIV execution-path reserve | 2.0 | A$338 | existing-mint DAMM v2 pool/lock/first-buy proof path; **mainnet opening price remains unset** |
| PHENIX $PNEX prelaunch reserve | 2.5 | A$423 | mint/metadata, launch transaction set, vesting/lock/proof and liquidity-path transaction buffer |
| MIRACLE $MRCL prelaunch reserve | 3.0 | A$508 | launch/lock/proof buffer including the A$200 creator-first-buy target (~1.18 SOL at snapshot) |
| Untouched contingency reserve | 1.5 | A$254 | failed/repriced transactions, account rent changes and release-gate contingency |
| **TOTAL WORKING TARGET** | **10.0 SOL** | **≈ A$1,692** | **reserve, not planned expenditure** |

## Spending gates

1. **WLDZ** — already live; do not remint or recreate its launch. No new WLDZ genesis budget.
2. **RVIV** — canonical mint already exists. Do not create another RVIV mint. Mainnet pool/first-buy spend stays blocked until the opening-price decision and direct DAMM v2 transaction simulation are reviewed.
3. **PNEX** — no canonical mint yet. Spend remains blocked until the prelaunch specification, recipients, vesting, liquidity route, simulation and signature review pass.
4. **MRCL** — no canonical mint yet. The creator first buy targets A$200 of real SOL, but the exact SOL amount is deliberately **null until transaction review**. Virtual DBC liquidity is not real backing.
5. **Devnet** — do not burn mainnet SOL merely to work around a dry faucet. Devnet funding is a proof-infrastructure problem, not permission to spend production funds.
6. **All tokens** — never expose a seed phrase/private key, never invent a recipient/signer, and never count an unsigned/simulated transaction as executed proof.
7. **Unused reserve** — stays unspent. A reserve bucket is a ceiling for readiness, not an instruction to consume it.

## Suggested funding sequence

- **Stage A: 2 SOL** — enough working headroom for network/proof activity while all mainnet launch gates remain closed.
- **Stage B: 5 SOL total** — preparation reserve for RVIV + PNEX transaction reviews.
- **Stage C: 8.5 SOL total** — adds the MRCL launch reserve including its first-buy target.
- **Stage D: 10 SOL total** — leaves the 1.5 SOL contingency untouched.

## Re-price rule

Before any value-moving signature:

**Current wallet balance → live SOL/AUD → exact transaction simulation → exact rent/priority/venue costs → readable allocation/fee disclosure → human approval/signature → broadcast → confirmation → Worldz Proof receipt.**

If the live quote no longer fits the relevant reserve, stop and re-budget. Never silently pull from another token's allocation or treasury bucket.
