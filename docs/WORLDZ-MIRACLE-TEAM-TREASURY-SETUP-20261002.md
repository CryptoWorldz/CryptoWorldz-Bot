# Worldz Miracle Team Treasury — Setup Record

Date: 2026-10-02
Status: OWNER APPROVED / PENDING SQUADS DEPLOYMENT

## Purpose

Create a second, separate Solana Squads treasury named **Worldz Miracle Team Treasury**.

This does not replace the live **Worldz Operations Treasury**. It receives **30% of revenue that would otherwise have been routed 100% to the Operations Treasury** after the Miracle Team treasury is live-verified.

The split applies only to treasury-bound revenue:
- 70% → Worldz Operations Treasury
- 30% → Worldz Miracle Team Treasury

It does not add a new fee, change token supply allocations, or override explicit Creator, Referrer, Legacy, Core Token, LP, Buyback/Burn, Impact or other Fee Flow lanes.

## Governance

- Members: 8
- Threshold: 4-of-8
- Provider: Squads v4
- Separate vault from Worldz Operations
- Separate from the disabled Reserve Treasury
- Human approval required
- No automatic broadcast until live 4-of-8 state and destination vault are verified

## Current valid signer public keys

1. JayJayTeamDev — `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u`
2. Stepper — `DwWj3EuyaL2ufZASdZ3DPGyaSEqnjzAPxfLAxq5MRLhJ`
3. Savage — `2DqyvXoA7VnyWH6n6yVV1XoS2pdBDHMKsj3tRRFaTpbn`
4. Mahammad — `6VtCKsBA5pt5WcWF5sENEb9BM4FLp2Ezn5VYEcCY5Mok`
5. Zephyr — `JDaTy19tZZLEuMnLgg5mfGbyhgEPnsizqJnMEAUvK8cc`
6. Troll George — `GCDEywsF5XtNuH7Jv2gdetEr5oCX4yBRLRHwjSVutFKc`

Two signer slots are reserved and pending public keys:
- SolPaul — verified public Solana key required;
- SolMark (@MARKW30) — verified public Solana key required.

The four additional owner-controlled wallets are tracked separately for allocation custody and are not treated as separate human signers.

## Activation gate

The 30% Miracle Team route remains OFF until:
1. verified public Solana keys for SolPaul and SolMark (@MARKW30) are supplied and all final 8 keys validate as Solana public keys;
2. the Squads multisig and Vault #0 addresses are recorded;
3. live chain state reads 8 members / threshold 4;
4. the 70/30 treasury-bound revenue route passes simulation;
5. an explicit human approval enables routing;
6. Worldz Proof records the activation.

Until then, 100% of treasury-bound revenue continues to the existing Worldz Operations Treasury.
