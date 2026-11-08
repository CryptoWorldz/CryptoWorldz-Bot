# Worldz $Worldz genesis V2 — PREPARATION ONLY

This branch introduces a separate, non-executable policy manifest and validator for the approved 11 allocation buckets (100,000,000 tokens). No mint, transaction, deployment, or signer change is performed.

## Boundary
The existing public WorldzMINT v1 app and Supabase function enforce five project allocations plus a 0.60% platform split and multisig recipients. Those public-project rules are NOT silently removed or bypassed. A dedicated Worldz genesis V2 transaction workflow needs separate UI, server verification, recipient proof, and test coverage before it can be activated.

## Preconditions
- Verify full primary Dev wallet address and actual signing access.
- Obtain 11 approved receiving destinations (or an explicitly approved shared-custody accounting design) and independently verify access.
- Reconcile historical WLDZ Founding 100 and legacy holder commitments before public claims or distributions.
- Audit actual mint identities and chain state; do not confuse this plan with an already minted asset.
- Test exact token amounts, recipient balances, authority revocation and transaction recovery on devnet.
- Keep mainnet broadcasting disabled until separate explicit approval.

No private keys or seed phrases belong in this repository.
