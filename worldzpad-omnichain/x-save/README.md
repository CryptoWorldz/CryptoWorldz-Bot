# Worldz X-SAVE™

## XRP–Solana Alliance Value Engine

**Launch with XRP. Build on Solana. Prove across Worldz.**

X-SAVE is the dedicated XRP × Solana launch rail inside Worldz Omnichain.

It is not a claim that Worldz invented wXRP pairing. The competitive point is the full product around it: dedicated wXRP price discovery, XRP/Solana dual-wallet onboarding, creator and referral economics, XRPL-native project passporting, white-label integrations and Worldz Proof.

## X-SAVE Pair™

A Solana creator launches a new SPL token with **canonical wXRP as the quote asset**.

Target path:

```
Creator
  ↓
Worldz X-SAVE™
  ↓
TOKEN / wXRP Meteora DBC
  ↓
75-bps MagicFeeNumber™ candidate
  ↓
XRP-denominated bonding curve
  ↓
DAMM v2 graduation
  ↓
100% permanent migrated-LP-lock target
  ↓
Jupiter routing
  ↓
Worldz Proof™
```

The production wXRP mint currently pinned for verification is:

`6UpQcMAb5xMzxc7ZfPaVMgx3KqsvKZdT5U718BzD5We2`

It must be reverified before any mainnet configuration is signed.

## Why an XRP developer would use it

They do not have to pretend XRPL is Solana.

They can keep an XRPL-native token and CLOB/AMM market, while using X-SAVE as a separate Solana expansion rail.

The Solana market is priced in **wXRP**, not SOL. That means the project's price discovery, migration threshold and collected quote-side fees stay visibly connected to XRP.

## Why a Solana developer would use it

X-SAVE gives the creator an XRP-native acquisition story:

- dedicated wXRP launch pair;
- XRP-community discovery feed;
- XRP-linked creator fee receipts;
- launchpad/community referral economics;
- optional XRPL project identity;
- one Worldz Proof record explaining which asset is canonical on each chain.

## X-SAVE Passport™

A project can register:

- Solana mint;
- XRP Ledger issuer/token identity;
- verified websites/socials;
- quote asset;
- pools/AMMs;
- fee policies;
- proof records.

Passporting **does not imply that separate tokens on two chains are fungible**.

Cross-chain fungibility can only be displayed after a separately audited bridge or mint/burn supply controller proves it.

## X-SAVE TwinRail™

A project may operate:

**XRPL:** native fungible token + XRPL CLOB/AMM.

**Solana:** SPL token + wXRP launch/graduated pool.

Both appear under one Worldz project dashboard, but remain clearly labeled native markets unless a real bridge is separately proven.

## X-SAVE PartnerRail™

Worldz does not need competing launchpads to disappear.

A launchpad, wallet, community or API product can integrate X-SAVE and remain the **primary Worldz referrer**, receiving the locked v1 **17% of Worldz-controlled fee revenue** attributable to its route.

That changes the pitch from:

> Switch to our launchpad.

to:

> Keep your users and brand. Add an XRP × Solana launch rail and earn when they use it.

## XRP Ledger fee rule

XRPL AMMs can support trading fees from 0% through 1%, so **0.75% is representable**.

But an XRPL AMM fee is an LP-market mechanic, not the same as Meteora DBC creator/partner routing, and LPs can vote on the AMM trading fee.

Therefore X-SAVE will **not** use an issuer TransferRate as a disguised Worldz tax.

Every XRPL charge must describe exactly what it pays for and where it goes.

## Bridge rule

Worldz does not custody native XRP and does not mint canonical wXRP.

Bridge/wrapping access is an integration with an approved external provider. The UI must disclose:

- native XRP source;
- wrapped asset destination;
- canonical wXRP mint;
- custody/provider;
- bridge/messaging provider;
- fees;
- execution risk;
- redemption route.

## MagicFeeNumber™

For the Solana X-SAVE rail, the target remains:

**0.75% gross / 75 bps**

with dynamic fee OFF.

After external protocol deductions, Worldz-controlled revenue uses:

- 51% Creator
- 17% Referrer
- 15% Legacy Flywheel
- 8.5% WorldzLaunchPad
- 8.5% OneWorldz Impact

No hidden fee may be added under the X-SAVE name.

## Mainnet

**OFF.**

The first implementation milestone is a devnet/test harness using a mock 6-decimal XRP quote asset, followed by a read-only mainnet compatibility proof against the canonical wXRP mint. No mainnet DBC config or pool is created until the quote-mint requirements, fee route, migration and lock all pass.
