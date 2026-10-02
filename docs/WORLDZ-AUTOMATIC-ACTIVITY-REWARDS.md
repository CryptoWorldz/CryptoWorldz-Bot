# Worldz Automatic ShillPoints + RaidPoints

**Build:** 2026-10-02  
**Status:** feature build; live status still requires migration + runtime deployment proof.

## Goal

Remove routine Admin approvals from ordinary community activity without turning the Treasury multisig into a hot wallet.

## Normal member flow

1. A registered Legend completes a genuine Raid or submits a unique public Shill proof.
2. ZED runs the automatic activity-reward gate.
3. Duplicate protection, daily caps, per-user weekly caps and the existing global weekly reward budget are checked.
4. A normal claim receives Legend Points automatically.
5. Only held / capped / unusual cases appear in Admin review.
6. Completed-week points feed the existing proportional Reward Wallet allocator.
7. Members with connected wallets are automatically moved to the approved allocation state.

## Default protection

- Raid claims: maximum 5 automatically awarded claims per member per day.
- Shill proofs: maximum 5 automatically awarded proofs per member per day.
- Maximum automatically issued activity points per member per day: 100 LP.
- Maximum automatically issued points per member per week: 300 LP.
- Existing global weekly/category reward-pool enforcement remains authoritative.
- Duplicate mission claims and duplicate Shill proof URLs remain blocked.

These values are settings, not hard-coded product promises.

## Funding boundary

```
WORLDZ TREASURY
      ↓ periodic capped funding
RING-FENCED REWARD WALLET
      ↓ automatic weekly allocation
ELIGIBLE MEMBER WALLETS
```

The Treasury is **not** used for one transaction per member. The Rewards Wallet is the spending boundary.

Current automatic allocation uses the existing `reward_auto_settings.pool_percent` (10% by default) against the available Reward Wallet snapshot. This keeps the payout pool self-limiting even if points activity is high.

## What is automatic now

- ShillPoints decision path.
- RaidPoints decision path.
- per-user cap checks.
- existing weekly reward-budget checks.
- automatic allocation status for members with a connected wallet.
- exception-only review path.

## What is deliberately not automatic yet

On-chain SOL/USDC signing is not enabled by this build. The system calculates and approves the capped allocation automatically, but a dedicated limited payout signer or claim executor must be separately enabled before on-chain transfers can occur.

That separation prevents a Telegram bot or web runtime from holding unrestricted Treasury authority.

## Commands

- `/shillpoints` — ShillPoints rules and enabled assets.
- `/shillpack` — current ready-to-share campaign.
- `/raidpoints` — personal RaidPoints caps, usage and Reward Wallet model.
- `/rewardasset usdc|sol` — member payout preference.
- `/fundingplan` — owner Reward Wallet funding view.

## Admin role after this change

Admins handle exceptions rather than every successful action:

- daily/weekly cap holds;
- suspicious or duplicate evidence;
- disabled assets;
- exhausted weekly pool;
- missing wallet/payout exceptions;
- abuse investigations and reversals.
