# WorldzFullBuild™ — master architecture

**Canonical machine contract:** `worldzpad-omnichain/fullscope/worldz-fullbuild.v1.json`

WorldzFullBuild™ is the umbrella architecture for the complete Worldz technology build. The existing wallet, approval, distribution, vesting and delivery-truth standards remain canonical. This integration adds WorldzFullScope™ as a required subsystem rather than creating a second FullBuild definition.

## Architecture

```text
WorldzFullBuild™
│
├── ZED LED Command Centre MAX™
│   ├── AUTO
│   ├── G.R.A.C.E.
│   └── RECAP
│
├── WorldzLaunchPad™
│   └── Worldz Omnichain™
│
├── WorldzFullScope™  [REQUIRED]
│   ├── WorldzWatch™
│   ├── WorldzTrade™
│   ├── WorldzInvest™
│   ├── WorldzLock™
│   ├── WorldzVest™
│   ├── WorldzAlert™
│   ├── WorldzAuto™
│   ├── WorldzProof™
│   ├── Worldz Votes Centre™ — POPULARITY ONLY
│   └── WorldzGovern™ — DAO GOVERNANCE ONLY
│
├── Legacy Flywheel™
└── Worldz Treasury
```

## FullScope capacity contract

- 8 current supported WorldzLaunchPad chains.
- Up to 20 enabled token environments per chain.
- 160 initial token environments.
- External-wallet custody and signature boundaries.
- Mainnet execution OFF by default until the specific adapter passes its release gate.

## Never mix the two vote systems

**Worldz Votes Centre™** is for token popularity, trending, rankings, raids and visibility.

**WorldzGovern™** is for DAO proposals, treasury decisions, rules, grants, delegation and approved governance execution.

Popularity votes cannot authorize governance. Governance votes cannot boost popularity rankings.

## Release truth

A code change is not an on-chain result. A green deployment is not an end-to-end proof. WorldzFullBuild inherits the canonical delivery-truth and wallet-release standards already recorded in the master contract and `docs/WORLDZFULLBUILD-WALLET-RELEASE-STANDARD.md`.
