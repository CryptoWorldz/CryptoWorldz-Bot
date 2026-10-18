# Worldz Token Distribution Deployment — 2026-10-02

## Treasury gate

The current Worldz Operations Treasury is the Team Zed Squads vault:

- Multisig: `B9S37HguduNZ5TXWCxMi7cZMCm89ExCB751N4bpMQ7bN`
- Vault #0: `n9Jq3soh2ka22xNAy2syX96Pp3QZB7mc7kwysgNvhHB`
- Members: **5**
- Permanent approval threshold: **3-of-5**
- Reserve Treasury: **disabled / not deployed**

Every distribution path must reread the live Squads state before constructing a proposal. Old 1-of-2 / 1-of-1 execution assumptions are invalid.

## #001 WORLDZ — WLDZ

Canonical mint: `AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U`  
Fixed supply: **100,000,000 WLDZ**

Already executed:

- 8,000,000 WLDZ — JayJayTeamDev
- 15,000,000 WLDZ — initial Meteora liquidity / lock path

Controlled remainder: **77,000,000 WLDZ**.

Current remainder model:

- 20M staged liquidity — remain in treasury pending reviewed LP addition
- 5M Purple Diamond Handz holder pool — exact equal-claim manifest still required
- 10M Founding 100 — 100 × 100,000 after verified launches
- 10M Worldz Impact — pending 3-of-5 approved distribution
- 10M Operations Treasury allocation — remains in Squads
- 5M Reserve earmark — remains in Operations Treasury because Reserve is disabled
- 1M Stepper — pending earned-team approval
- 4M future team reserve — pending earned-team approvals
- 5M DevCity — current target 100 verified wallets, 50,000 WLDZ each
- 2M community rewards — pending exact reward proposal
- 5M operations/security/infrastructure — pending exact 3-of-5 approved use

The old public **55M direct-wallet batch is retired and blocked**. It included the already-live 8M owner allocation and older Reserve / DevCity / team assumptions.

## #002 REVIVE — RVIV

Canonical mint: `DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R`  
Fixed supply: **200,000,000 RVIV**

Model:

- 30M initial liquidity — existing mainnet pool path
- 30M Dev claims — 7 equal allocations, **zero immediate Dev unlock**, **12-month linear vesting**
- 20M Legacy Revival — 214 eligible snapshot wallets, unlocked claims
- 20M Worldz Impact — same Squads inner proposal
- 20M DevCity — 100 × 200,000, pending exact verified roster
- 30M Team vesting — pending exact approved beneficiaries and lock
- 40M staged liquidity — retained pending reviewed LP additions
- 10M Operations Treasury — retained
- 0.000052 RVIV rounding dust — retained

### OneDrop execution

The frozen OneDrop manifest contains **219 unique claimants**:

- 214 Legacy recipients
- 7 Dev recipients
- some wallets belong to both groups

Merkle leaves now carry two amounts:

- unlocked Legacy total: **19,999,999.999950 RVIV**
- locked Dev total: **29,999,999.999998 RVIV**

Permanent 3-of-5 flow:

1. JayJayTeamDev connects.
2. Browser verifies mint, source vault, Merkle root and live 3-of-5 Squads state.
3. Exact setup transaction is simulated.
4. JayJayTeamDev signs setup + proposal + approval **1/3**. **No Squads RVIV transfer executes in this step.**
5. Two additional Team Zed Treasury members approve the exact pending proposal in Squads.
6. Owner returns to OneDrop; the approved execution is rebuilt from live state and simulated.
7. Final execution moves the 49,999,999.999948 RVIV claim allocation to the Jito distributor and 20M RVIV to Worldz Impact.
8. Claimants pay their own claim/ATA fee when required.
9. Dev claimants can return during the 12-month vesting period to withdraw additional vested RVIV.

## #003 PHENIX — PNEX

Canonical ticker: **PNEX**.  
Fixed supply target: **250,000,000 PNEX**.  
Canonical mint: **not created / not verified yet**.

Locked pre-launch allocation:

- 10% / 25M PHENIX Chance immediate
- 15% / 37.5M PHENIX Chance vested over 12 monthly releases
- 45% / 112.5M liquidity, including 5% / 12.5M genesis and 40% / 100M staged reserve
- 10% / 25M developer vesting — 0 immediate, 90-day cliff, 24 monthly releases
- 1% / 2.5M Purple Diamond Handz
- 19% / 47.5M PHENIX Total Supply FlyWheel

No mainnet distribution can execute until the PNEX mint exists and exact recipient amounts are approved. Registered wallet eligibility is not permission to invent an amount.

## #004 MIRACLE — MRCL

Canonical ticker: **MRCL**.  
Fixed supply target: **348,000,000 MRCL**.  
Canonical mint: **not created / not verified yet**.

Committed allocation:

- 20% / 69.6M Miracle Team Vault — opt-in + verified wallet; 0 immediate; 30-day first release; 24 monthly releases
- 20% / 69.6M MiracleMagicVault — verified people-in-need gift supply
- 5% / 17.4M genesis liquidity target
- 1% / 3.48M Purple Diamond Handz
- 54% / 187.92M remains intentionally unallocated

The Worldz Operations 3-of-5 treasury can custody pending MRCL allocations once the token exists, but it does **not** silently replace the separately proposed Miracle Team signer/consent model.

## DevCity

The deployment target is **100 real, verified wallets**. No address may be invented.

- WLDZ: 5M total → 50,000 WLDZ × 100
- RVIV: 20M total → 200,000 RVIV × 100

Distribution stays blocked until the final exact 100-wallet roster is approved and deduplicated.

## Team allocations

Team allocations are not automatically paid merely because a wallet is known.

- WLDZ Stepper / future-team buckets: pending earned allocation approval.
- RVIV Team 30M: pending exact beneficiaries + vesting lock.
- PNEX developer bucket: locked pre-launch; exact beneficiary amounts pending.
- MRCL Miracle Team: opt-in + verified public wallet + approved allocation ledger.

## Legacy: two different systems

Do not merge these concepts:

1. **Legacy holder distributions** — WLDZ Purple Diamond Handz and RVIV Legacy Revival claims are allocations to historical eligible holders.
2. **Legacy Core revenue lane** — a closed 12-token set receives **15% of eligible revenue as transparent market buys**, split **1.25% each**. It is not funding to historical distribution wallets.

Legacy Core members are PDC original, two PDC1 records, PDCMAGA, PDCshare, PurpleDC, PurpleOg, PCC1 Legacy, INVEST, LMTD, NBC and HSSC. NBC mint must be verified before automated market-buy execution.

## Fee rule

There is no fixed requirement that JayJayTeamDev hold 0.05 SOL before opening a distribution UI.

Every stage must:

- simulate the exact transaction first;
- show the estimated SOL debit;
- refuse signing if the connected payer cannot cover it;
- avoid sender-funded hundreds-of-wallet ATA creation where a claimant-funded Merkle claim can do the job safely;
- never broadcast automatically.

Other 3-of-5 signers may need a small SOL balance for their own approval transactions.

## Immediate deployment order

1. **RVIV OneDrop 3-of-5** — exact recipient manifest exists; now reconciled to Dev vesting.
2. Freeze the exact **RVIV DevCity 100** roster, then build its distribution.
3. Freeze exact **RVIV Team** beneficiaries + vesting.
4. Build current **WLDZ** equal-holder claim / DevCity / earned-team manifests from the 77M controlled remainder.
5. Mint + verify **PNEX** before any PNEX mainnet distribution.
6. Mint + verify **MRCL**, resolve the intentional 54% unallocated supply, and obtain Miracle Team opt-in/signers before MRCL distribution.
