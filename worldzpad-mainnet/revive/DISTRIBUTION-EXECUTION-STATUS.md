# REVIVE distribution — execution status, 26 September 2026

**No distribution transaction has been signed or sent by this build.**

## Exact legacy batch

The database snapshot `4b7faa3f-c6cd-435f-9840-43a04cd090a0` was exported to `revive-legacy-216-distribution.v1.json`: **216 distinct wallets**, **20,000,000,000,000 raw units** = **20,000,000 RVIV**, 6 decimals. All had `UNCLAIMED` status at export. This is the review source for eventual Squads vault transfers. Each transfer must be reconciled against its transaction receipt and the claim ledger, so no wallet can be paid twice.

Read-only on-chain preflight at 26 September 2026 04:46 UTC, run `36218819443`:

| Check | Result |
|---|---:|
| Squads vault #0 RVIV | 170,000,000 RVIV |
| JayJayTeamDev fee wallet SOL | 0.029059039 SOL |
| Squads vault #0 SOL | 0 SOL |
| Existing recipient RVIV token accounts | 2 |
| Missing recipient RVIV token accounts | 214 |
| Rent per missing token account | 0.00148844 SOL |
| Missing token account rent | **0.31852616 SOL** |
| Difference before proposal rent and fees | **0.289467121 SOL** |

**Hard gate:** The 216-wallet direct send cannot be completed using the observed SOL balance. Squads proposal account rent, transaction fees and vault-side SOL funding raise the required total further. Recheck balances and ATA existence before preparing exact signable batches; funding must reach the correct payer/vault path. A direct signature by JayJayTeamDev does not grant direct control over the off-curve Squads vault. The member must approve a reviewed Squads vault proposal.

## Other locked buckets

- DevCity™: 100 seats × 200,000 RVIV = 20M pool. The current 105 publicly sourced wallets are **research candidates**, not an approved roster. Existing 50 seat wallet mapping and new 50 accepted participants must be verified; no 100-wallet transfer manifest exists.
- Team: 30M RVIV requires final beneficiary weights and 12 monthly Jupiter vesting releases with 0% immediate and no cliff. Known team wallets do not supply allocation weights.
- Legacy Dev six wallets, OneWorldz charity, treasury and LP allocations remain separate. Do not redirect their inventory to fill a shortfall.

## Signable path when gates clear

1. Freeze and hash the exact recipient and raw amount manifest. Recheck source ATA, mint, batch total, duplicate addresses, existing payouts and account-rent costs.
2. Assemble transaction-sized Squads vault proposals with `createAssociatedTokenAccountIdempotent` where needed and `transferChecked` from the canonical RVIV vault ATA. Every batch must show each destination, amount, rent payer, total and fee estimate before signing.
3. Simulate each exact proposal and vault execution with the correct Squads multisig, vault index, member permission and current transaction index. A stale index must be rebuilt before approval.
4. JayJayTeamDev connects at the official Squads app, reviews and signs each exact proposal, vote and execution. The Turn Up Town message-only wallet proof does not authorize RVIV movement.
5. Record signatures and confirmed token movements; mark only successful recipients paid in the ledger, with idempotent reconciliation and a public distribution proof.

Official signing interface: https://app.squads.so/ — **no proposal has been prepared there for signature yet**.
