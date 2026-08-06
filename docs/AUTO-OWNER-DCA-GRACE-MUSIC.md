# Auto Owner DCA + Grace Controller

Prepared: 6 August 2026

## Auto DCA

Auto now has a separate owner-only DCA control plane for small scheduled buys.

Safety boundaries:

- one dedicated public Solana Dev Wallet;
- owner Telegram ID only for wallet, limits, schedule and activation controls;
- token allowlist required;
- buy-only schedules;
- no automatic selling;
- no coordinated or multi-wallet trading;
- order, daily, weekly and monthly caps;
- minimum interval, slippage and price-impact limits;
- pause, cancel and emergency stop;
- public transaction-signature audit records;
- no seed phrase or private key accepted by Telegram, the Mini App, GitHub or the Auto control database.

The control plane can be deployed before a wallet exists. Live execution remains locked until the dedicated wallet address and separate secure executor are configured and verified as matching.

## Grace Controller

The `grace_manager` role is a scoped social-operations role. It may use Grace to view the social workspace, draft, schedule, approve or reject posts and review results. It cannot connect social credentials, change budgets, enable posting, clear an emergency stop or use direct Zed broadcasts.

Music is assigned:

- Telegram ID: `5457233387`
- Role: `Grace Controller`
- Responsibility: `Social Communications & Engagement`

## Profiles

`/profile` now displays Team Role and Responsibility separately from earned Legend Rank and Legend Points.
