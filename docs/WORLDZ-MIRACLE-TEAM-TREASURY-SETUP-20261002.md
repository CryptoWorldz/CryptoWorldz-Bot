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

## Confirmed signer public keys

1. JayJayTeamDev — `Fap54GTCo4ZopkwmHtbSUJZTsjTybftJfN9sPG3MHp4u`
2. Stepper — `DwWj3EuyaL2ufZASdZ3DPGyaSEqnjzAPxfLAxq5MRLhJ`
3. Savage — `2DqyvXoA7VnyWH6n6yVV1XoS2pdBDHMKsj3tRRFaTpbn`
4. SolMusic — `FmFtkknYe3BaHJ2HJGquV2MqCrjX4c14jk4kbLHg27kJ`
5. Mahammad — `6VtCKsBA5pt5WcWF5sENEb9BM4FLp2Ezn5VYEcCY5Mok`

## Remaining three signer slots

Use three additional **verified Legend/Admin/Miracle Team wallets belonging to distinct consenting people**.

Do not invent addresses.

Owner-controlled legacy/spare wallets may be used for allocation custody, but should not be counted as independent team approvals. Multiple wallets controlled by one person weaken the effective multisig threshold.

## Activation gate

The 30% Miracle Team route remains OFF until:
1. all 8 signer public keys are recorded;
2. the Squads multisig and Vault #0 addresses are recorded;
3. live chain state reads 8 members / threshold 4;
4. the 70/30 treasury-bound revenue route passes simulation;
5. an explicit human approval enables routing;
6. Worldz Proof records the activation.

Until then, 100% of treasury-bound revenue continues to the existing Worldz Operations Treasury.
