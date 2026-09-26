# REVIVE — full 200M allocation check

Checked 26 September 2026 against `revive-launch-contract.v1.json`, the exported 216-wallet ledger and the read-only treasury preflight. Statuses describe token movement, not merely a written allocation.

| Bucket | RVIV | % | Destination / actual status |
|---|---:|---:|---|
| Six legacy Dev wallets | 30,000,000 | 15 | **Reserved in Squads vault.** Exactly 5,000,000 per listed wallet; no fanout executed. |
| Team | 30,000,000 | 15 | **Reserved in vault.** Jupiter Lock/Vesting: 0% immediate, no cliff, 12 monthly releases. Beneficiary weights and verified setup pending. |
| Initial pool liquidity | 30,000,000 | 15 | **In the mainnet RVIV/WSOL pool.** The single initial position showed 100% permanent locked liquidity at read-only audit. |
| Staged liquidity reserve | 40,000,000 | 20 | Reserved in vault; future additions require separately reviewed transactions. |
| Legacy Revival, 216 wallets | 20,000,000 | 10 | Exact ledger exported; zero paid. Direct fanout blocked by 214 missing recipient token accounts and SOL funding. |
| DevCity™ 100 | 20,000,000 | 10 | 100 × 200,000 reserved in vault. No approved 100-wallet roster; 105 public candidates are research leads only. |
| OneWorldz charity impact | 20,000,000 | 10 | Ring-fenced in vault; staging destination recorded but no transfer executed. This is separate from personal shares and token trading liquidity. |
| Worldz treasury / operations | 10,000,000 | 5 | Reserved in vault. |
| **Total** | **200,000,000** | **100** | **30M in pool + 170M in Squads vault at 04:46 UTC preflight.** |

## Six Dev wallets — 5,000,000 RVIV each

| Label | Destination |
|---|---|
| Limited Edition | `5HiRrJRU1fyW5eXzHgvSgykBZ6PtrSVzg8A1e8eHB1u9` |
| Next Big Coin Dev | `3jA7TFbW6h8q75mWpYxkAiAntRm16z9ZRnLiZkjFCTdt` |
| PdCrew | `DgsWus6bxAMck9eXmS7V3tVNp8n7DinPQrEVexdju94j` |
| Purple Diamond Crew | `ABmLL6XyNZPBQ5LZpg6DoxqtzHTCUufWUNMkbFfFh53U` |
| Purple PDC | `G35RixuDLj8NQJ7c8wnKF4Hc518nbYxp1cZwGL5wJTG3` |
| SolSavewXRP | `5BbgurmtXVr1tohm6NTYU8pmM4n7xQVqp9DTKePN1UW9` |

The launch contract treats these six as owner-controlled legacy Dev wallets; fresh signing control has not been proven by this file alone. The JayJayTeamDev signer / SOL fee wallet `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u` is **not** an additional direct RVIV recipient under this allocation. JayJayTeamDev's 8M WLDZ is a different token allocation and must never be copied into RVIV. A later personal RVIV share would require an explicit change to the 200M plan before any transfer; do not invent one.

## Team roster currently recorded

Stepper `DwWj3EuyaL2ufZASdZ3DPGyaSEqnjzAPxfLAxq5MRLhJ`; Remedy `5fFVkQuo4pnCpWhD8hx2uiFEtkBcnW3QdDUt1w2BzB71`; Remedy Save `43T8jncT5pJFo1TNenHdt6NSaPieic3iuHLQnYLLgeWy`. **No amount or percentage per person is approved.** The Remedy Save wallet must not be assumed to be a fourth person or an independent extra share. The 30M stays in the vault until weights, beneficiaries and vesting implementation are proved.

## Cross-bucket overlap

Limited Edition and Purple Diamond Crew Dev wallets also have *separate* legacy snapshot entitlements. Remedy and Remedy Save team wallets also appear in the 216-wallet legacy ledger. These are four overlapping addresses across distinct buckets; the same wallet can receive separately authorized amounts, but receipts must identify bucket and batch so a transfer cannot be mistaken for payment of another entitlement.

## Signing gate

No Squads distribution proposal is ready for signature. Confirm on-chain balances and any prior payments immediately before preparing exact instructions. The 216 direct fanout alone needs at least 0.31852616 SOL for 214 missing RVIV token accounts at the 04:46 UTC check, beyond the observed 0.029059039 SOL in JayJayTeamDev's wallet and 0 SOL in the vault. Other buckets add account rent and Squads proposal fees. Every Squads proposal must show destination, amount, token mint, source vault, fee payer and transaction preview before signing.
