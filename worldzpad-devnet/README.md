# WorldzPad WLDZ Execution Harness

This harness turns the #001 WORLDZ / WLDZ design into progressively stronger execution proofs without touching the final mainnet signer or real launch funds.

## Phase 1 — Token-2022 supply / vault / authority proof

The workflow now always runs an isolated Solana local validator and:

1. checks the locked 100M / 25-25-25-25 / AUTO rules;
2. creates a Token-2022 test mint;
3. mints exactly 100,000,000 TEST WLDZ;
4. allocates 25M each to Founder, Liquidity, People+Charity and Ecosystem master vault token accounts;
5. revokes mint authority;
6. verifies freeze authority is unset;
7. independently reads the on-chain supply and all four vault balances;
8. publishes only public proof data.

The same workflow separately confirms that the real Meteora DAMM v2 program is executable on Solana devnet and that the pinned SDK exposes `CollectFeeMode.OnlyB`.

A real public DEVNET mint can also run when a disposable pre-funded test payer is supplied through GitHub Actions secret `DEVNET_PAYER_SECRET_JSON`. The mainnet signer must never be used for that purpose.

## Phase 2 — real DAMM v2 program execution locally

The local validator is started with official program binaries and fixture accounts pinned from `MeteoraAg/meteora-invent` commit `648871eb1daaf0acd72351e16394e68562ebaac0`.

After Phase 1 succeeds in the same isolated run, Phase 2:

- transfers exactly 1,000,000 TEST WLDZ from the Liquidity master vault;
- wraps 0.2 TEST SOL as the quote asset (test value only; not the mainnet A$200 target);
- creates a real WLDZ/wSOL Meteora DAMM v2 customizable pool;
- uses `CollectFeeMode.OnlyB` with wSOL as token B;
- uses a fixed 200 bps / 2.00% base trading fee;
- uses no bonding curve or graduation phase;
- requests locked liquidity at pool creation;
- simulates before sending;
- fetches the resulting on-chain pool state and fails unless token A=WLDZ, token B=wSOL, `OnlyB=1`, and the decoded base fee is exactly 200 bps.

## AUTO accounting proof

A deterministic test reconciles one SOL of net Worldz-side claimable fee revenue through:

- 10% Board;
- 40% HODLer rewards;
- 20% LP growth;
- 15% buyback/burn;
- 10% Charity;
- 5% Raaiiidd/Growth.

The 40% HODLer route is further proven as 70% proportional + 30% square-root Equalizer: larger holders still receive more in absolute terms while smaller eligible holders receive a higher reward per token.

## Security boundary

Ephemeral test private keys exist only inside `.runtime/` during a workflow job. `.runtime/` is gitignored and is never uploaded as an artifact.

This harness does **not**:

- create the final `WLDZ...` vanity mainnet mint;
- use JayJayTeamDev's mainnet private signer;
- spend the intended A$200 mainnet liquidity;
- connect the separate Command Centre private runtime;
- claim that a local-validator address is a public devnet/mainnet address.

## Next after Phase 2

Once pool creation passes, Phase 2B will execute controlled WLDZ↔wSOL swaps, inspect/claim the resulting position fees, and prove quote-side `OnlyB` fee collection before AUTO routes real test proceeds. Then come LP-addition, buyback/burn, reward-claim and Charity-route protocol tests before any mainnet launch decision.
