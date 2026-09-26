# REVIVE — full 200M allocation check

Checked 26 September 2026 against `revive-launch-contract.v1.json`, the exported 216-wallet ledger and the read-only treasury preflight. Statuses describe token movement, not merely a written allocation.

| Bucket | RVIV | % | Destination / actual status |
|---|---:|---:|---|
| Seven owner-designated Dev wallets | 30,000,000 | 15 | **Reserved in Squads vault.** Exactly 4,285,714.285714 per listed wallet; 0.000002 RVIV remains in the Dev reserve; no fanout executed. |
| Team | 30,000,000 | 15 | **Reserved in vault.** Jupiter Lock/Vesting: 0% immediate, no cliff, 12 monthly releases. Beneficiary weights and verified setup pending. |
| Initial pool liquidity | 30,000,000 | 15 | **In the mainnet RVIV/WSOL pool.** The single initial position showed 100% permanent locked liquidity at read-only audit. |
| Staged liquidity reserve | 40,000,000 | 20 | Reserved in vault; future additions require separately reviewed transactions. |
| Legacy Revival, 216 wallets | 20,000,000 | 10 | Historical ledger preserved; equal-share replacement proposed for 214 eligible wallets, 93,457.943925 RVIV each, with 0.000050 RVIV left reserved. Zero paid. |
| DevCity™ 100 | 20,000,000 | 10 | 100 × 200,000 reserved in vault. No approved 100-wallet roster; 105 public candidates are research leads only. |
| OneWorldz charity impact | 20,000,000 | 10 | Ring-fenced in vault; staging destination recorded but no transfer executed. This is separate from personal shares and token trading liquidity. |
| Worldz treasury / operations | 10,000,000 | 5 | Reserved in vault. |
| **Total** | **200,000,000** | **100** | **30M in pool + 170M in Squads vault at 04:46 UTC preflight.** |

## Seven Dev wallets — 4,285,714.285714 RVIV each

| Label | Destination |
|---|---|
| Limited Edition | `5HiRrJRU1fyW5eXzHgvSgykBZ6PtrSVzg8A1e8eHB1u9` |
| Next Big Coin Dev | `3jA7TFbW6h8q75mWpYxkAiAntRm16z9ZRnLiZkjFCTdt` |
| PdCrew | `DgsWus6bxAMck9eXmS7V3tVNp8n7DinPQrEVexdju94j` |
| Purple Diamond Crew | `ABmLL6XyNZPBQ5LZpg6DoxqtzHTCUufWUNMkbFfFh53U` |
| Purple PDC | `G35RixuDLj8NQJ7c8wnKF4Hc518nbYxp1cZwGL5wJTG3` |
| SolSavewXRP | `5BbgurmtXVr1tohm6NTYU8pmM4n7xQVqp9DTKePN1UW9` |
| JayJayTeamDev | `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u` |

The owner has now designated all seven destinations equally. The remainder of two raw units (0.000002 RVIV) stays reserved because seven equal on-chain integer transfers cannot total exactly 30M. Fresh signing control and the reviewed transaction remain required.

## Team

30M RVIV is reserved without an approved recipient or share. Stepper may apply, but receives no automatic tokens. Work evidence, participation, a signed wallet proof, approved amounts, and an exact Jupiter Lock schedule are required before any vesting. Remedy and Remedy Save have no team allocation. No AI-owned holding wallet is used.

## Historical ledger conflict

Remedy and Remedy Save wallet addresses are present in the historical 216-wallet snapshot with a combined 585,474.646611 RVIV recorded. They are marked excluded pending recalculation; the old 216 direct payout batches are blocked. A separate 214-wallet equal-share proposal leaves 0.000050 RVIV reserved; no transfer may use the historical weighted amounts. Historical data is retained for audit, not paid to those addresses.

## Cross-bucket overlap

Limited Edition and Purple Diamond Crew Dev wallets also have *separate* legacy snapshot entitlements. The excluded Remedy addresses occur in the historical ledger; neither may receive a payout. The two Dev wallet overlaps must be tracked separately by bucket.

## Signing gate

No single Squads distribution transaction is ready for signature. The 216 payout is blocked by exclusions, and DevCity lacks an approved 100-wallet roster. Confirm on-chain balances and any prior payments immediately before preparing exact instructions. The 216 direct fanout alone needs at least 0.31852616 SOL for 214 missing RVIV token accounts at the 04:46 UTC check, beyond the observed 0.029059039 SOL in JayJayTeamDev's wallet and 0 SOL in the vault. Other buckets add account rent and Squads proposal fees. Every Squads proposal must show destination, amount, token mint, source vault, fee payer and transaction preview before signing.

Read-only follow-up at 04:54 UTC: four of the six Dev token accounts exist; Purple PDC and SolSavewXRP do not. None of the three recorded team token accounts, the DevCity staging account, or the OneWorldz charity staging account exists yet. Those **seven additional** token accounts add **0.01041908 SOL** in rent at the observed rate. Legacy 216 plus these destinations therefore need **at least 0.32894524 SOL in token-account rent**, before Squads proposal rent, transaction fees, Jupiter vesting setup, and the 100 individual DevCity fanout accounts. This is an observed cost floor, not a funding instruction to transfer SOL to any unverified address.
