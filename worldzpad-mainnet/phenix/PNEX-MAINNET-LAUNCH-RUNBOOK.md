# PHENIX $PNEX — Mainnet Launch Runbook

**State:** PRE-SIGN BUILD. This runbook does not authorize mainnet execution.

## Phase 0 — Freeze the candidate

1. All PHENIX CI/validators must be green on one immutable candidate commit.
2. Record the candidate commit SHA in the release record.
3. Freeze token identity: PHENIX / PNEX / 250,000,000 / 6 decimals.
4. Lock the approved PHENIX logo at a stable public URI and build the final metadata URI.
5. Record the exact mainnet SOL funding available for genesis liquidity and transaction costs.
6. No allocation, fee, vesting, LP-lock or FlyWheel rule changes after candidate freeze without restarting review.

## Phase 1 — Bind authorities and destinations

1. Establish the required 2-of-3-or-stronger multisig for Treasury/FlyWheel/program authorities.
2. Bind the PHENIX Chance protected vault.
3. Bind the 100M staged-liquidity reserve.
4. Prepare the 25M developer Streamflow contract.
5. Bind the 2.5M Purple Diamond Handz claim vault.
6. Bind the 47.5M PHENIX Total Supply FlyWheel master vault.
7. Reconcile all destinations to exactly 250M PNEX before any mainnet signature.

## Phase 2 — Final simulation

1. Build the complete mint + metadata + allocation transaction set.
2. Build Streamflow vesting instructions and independently inspect program IDs, recipient, mint, schedule and security flags.
3. Build the Meteora DAMM v2 5% genesis-pool transaction from the exact approved SOL amount.
4. Verify 75 bps, dynamic fee OFF and permanent LP-lock semantics.
5. Simulate every transaction.
6. Stop immediately on any simulation mismatch, unexpected account, changed fee, changed authority or changed program ID.

## Phase 3 — Human signature boundary

Nothing broadcasts automatically.

The final review must display, in plain language:

- canonical PNEX mint being created/used;
- total supply and decimals;
- every genesis destination and amount;
- SOL amount entering genesis liquidity;
- derived opening pool ratio/price;
- mint/freeze authority final state;
- Streamflow vesting recipient and schedule;
- LP-lock state;
- multisig authorities;
- total expected transaction costs.

JayJayTeamDev or the configured multisig then explicitly signs the reviewed transactions.

## Phase 4 — Confirm before announcing

After confirmation, independently read back:

1. PNEX mint address, supply, decimals and authority state.
2. Every genesis destination balance.
3. Streamflow contract and schedule.
4. Meteora pool parameters.
5. permanent locked liquidity.
6. first swap result.
7. first actual claimed fee and router reconciliation.
8. Worldz Proof manifest.

**Do not publish “LIVE”, a CA, a price, or a buy link before these checks pass.**

## Phase 5 — Public launch

Publish only confirmed facts:

- canonical CA;
- token image + metadata;
- official WorldzLaunchPad PHENIX page;
- pool/buy route;
- allocation;
- vesting;
- LP-lock proof;
- fee structure;
- Worldz Proof;
- warnings that crypto prices can move and no return is guaranteed.

## Phase 6 — Post-launch systems

- PHENIX Chance claims can begin only for approved/verified claimants.
- Legacy PDH claims use the dedicated claim policy.
- 6-hour Legacy Flywheel continues independently.
- 30-day Worldz Universal Cycle begins at its approved activation anchor.
- PHENIX FlyWheel remains inside its 90-day hold and subsequent cycle allowances.
- ProofBurn remains manual, cycle-capped and wallet/multisig approved.
- staged liquidity additions must satisfy the Worldz +5% Quote Commitment Rule.

## Abort conditions

Abort the launch sequence if any of the following occurs:

- candidate commit changes unexpectedly;
- mint or destination differs from the reviewed plan;
- requested signature contains an unapproved instruction;
- supply/decimals differ;
- mint/freeze revocation is absent;
- vesting is cancellable/transferable or otherwise weaker than approved;
- LP can be withdrawn contrary to the permanent-lock target;
- fee settings differ from 75 bps / dynamic OFF;
- allocation does not equal exactly 250M;
- multisig requirement is not met;
- transaction simulation fails;
- public proof cannot reconcile the confirmed chain state.

Fail closed. Fix the mismatch. Re-simulate. Re-review.
