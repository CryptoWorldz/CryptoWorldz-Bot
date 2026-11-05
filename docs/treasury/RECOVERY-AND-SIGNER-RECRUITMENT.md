# Worldz treasury recovery and independent signer recruitment

## Existing Squads multisig first
The project documents an existing Solana Squads Operations treasury. Verify its on-chain configuration, vault index, signers and threshold before spending money to create another wallet. The founder reports losing access to the previous signer and has supplied a replacement public Solana wallet in the current support conversation. The replacement is **not yet an approved member**.

## Recovery procedure
1. Independently read the live Squads member list and threshold.
2. Verify the founder controls the replacement wallet through a signed challenge. Never request a private key or recovery phrase.
3. Ask an existing authorized member to propose removal of the inaccessible signer and addition of the new signer. Preserve the approval threshold.
4. Collect the required independent approvals, execute, then re-read chain state and verify membership. Record the transaction signature.
5. If quorum is unavailable, mark recovery blocked; do not transfer new treasury funds to an inaccessible vault.

## Governance
Worldz Operations 50% of treasury lane (target 3-of-5); Miracle Team 30% (target 4-of-7); Purple Diamond Crew 20% (target minimum 2-of-3). These are portions of the treasury lane, not all trading volume. Verify all treasury destinations before enabling automatic routing.

## Recruitment
Invite experienced Solana developers from Dev City and other reputable communities to express interest in independent signer and security review roles. Third-party wallet verification is not proof of personal trust or Worldz affiliation. Require opt-in, identity/reputation checks, conflict disclosure, documented responsibilities and independent approvals. No payment required to apply and no guaranteed tokens or governance power for expressing interest.

## Release policy
Continue devnet testing and preparation now. Keep public mainnet launches and automatic revenue distribution gated until signer recovery, three verified multisig destinations, audited adapters, liquidity locks, vesting, clear fee disclosure, legal review and explicit launch authorization are complete.
