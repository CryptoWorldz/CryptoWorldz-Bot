# WorldzLaunchPad™ launch settings — REVIVE pilot

Status: DESIGN STANDARD. REVIVE's live signing pages are token-specific; this document does not activate a public token launch or authorize transfers.

## Reusable launch profile

Every launch gets its own reviewed, versioned profile with:

- Canonical chain, mint, token program, decimals and total supply; independently checked against the chain.
- Authority state: mint and freeze authority, custody vault, multisig derivation, members, permissions and threshold.
- Allocation buckets whose raw token units sum exactly to the supply, including any division remainder. No recipient is inferred from a social handle.
- Recipient entries with a wallet address, allocation in raw integer units, evidence of eligibility, wallet control verification when required, token account status and approval state.
- Team reserve with opt-in membership, earned work, approved beneficiaries, vesting and release conditions. An empty team roster cannot trigger payouts.
- Community and impact pools with approved operators and claims; no unapproved wallet is paid.
- Vesting provider, beneficiary, start, release schedule and revocability as reviewed for that token. REVIVE's requested Jupiter schedule is zero immediate, no cliff and 12 equal monthly releases; this needs a separately verified executable integration.
- Fee policy kept distinct from token allocations, including third-party deductions and the actual recipients of collected fees. The proposed Worldz split must be verified against the executed route before advertising it as live.
- Network fee, account rent, transaction size, simulation result and maximum owner debit freshly quoted before each signature.
- Exact transaction message and a readable recipient/amount review. Reject a wallet signature whose message differs; verify confirmed receipt and balances.

## Pilot flow

1. Freeze the approved launch profile and compute a hash for its exact mint, recipients, amounts and authorities.
2. Read the live chain and fail closed on a mismatch, missing account, occupied proposal index or insufficient funds.
3. Build and simulate the exact transaction; display all instructions, token movement, SOL rent and network fees.
4. The owner signs in their own wallet. Compare the signed message with the reviewed bytes before broadcast.
5. For a Squads vault, create, approve and execute the same verified proposal. Each outer transaction requires its own signature.
6. Confirm on-chain receipts and write the executed signature and final balances into the launch record. Retry or resume only after proving the pending on-chain proposal matches the frozen profile.
7. Keep launch fees, token distribution, liquidity and vesting as separate approval paths even when they share a dashboard.

## REVIVE pilot boundaries

- First setup transaction creates three token accounts and transfers zero RVIV.
- The seven equal Dev shares are a separate Squads proposal totaling 29,999,999.999998 RVIV, leaving 0.000002 RVIV as allocation remainder.
- DevCity, Legacy, Team and impact allocations remain reserved until their specific recipients, eligibility and custody paths are approved.
- The public web pages loading does not prove that JayJayTeamDev's wallet can complete signing; this needs a real wallet test.

## Reuse gate

Promote a feature from this pilot to the default launch template only after its signed and confirmed REVIVE transaction is audited, a different token's test profile is independently simulated, and exact message review still works. Parameterize mint and recipients; never copy REVIVE addresses into a future token by default.
