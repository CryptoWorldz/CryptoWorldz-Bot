# Worldz Legacy Router — devnet proof program

This is a deliberately small native Solana program for the WorldzParTy devnet proof.

It does one privileged thing: move SOL from one of the ten Legacy Flywheel vault PDAs to a HODLer recipient.

Security model:
- each vault PDA is derived from `["legacy-vault", router_authority, legacy_mint]`;
- the matching router authority **must sign** every payout;
- the instruction re-derives the PDA and rejects the wrong vault;
- the System Program account is checked;
- the vault must contain enough lamports;
- the PDA signs the System Program transfer through `invoke_signed`.

No minting, swaps, token custody, arbitrary CPI, upgrade logic or mainnet key is contained here.

The devnet deployment must be compiled from this source and its deployed program ID recorded in the proof artifact. Mainnet deployment is outside this build and remains disabled.
