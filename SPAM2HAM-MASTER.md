# CryptoWorldz — Spam2Ham Master

Status: PILOT BUILD — 20 September 2026
Owner: CryptoWorldz
Campaign: Australia-first
Canonical website: https://spam2ham.cryptoworldz.xyz/

## Locked campaign identity
- National Spam2Ham Day™ — 1 December each year.
- Sunday Spam2Ham Spring Clean™ — one hour every Sunday in the lead-up.
- HAM = Helpful Action Mining™.
- Core line: “Kill Spam. Earn HAM. Turn Bytes into Bites.™”
- Supporting lines: Proof-of-Cleanup™, Spring Clean the Digital World.™, Bytes into Bites™.
- Concept inspiration: Newton’s Third Law — every action has an equal and opposite reaction. Spam is the action; Spam2Ham is the useful reaction.

## Pilot purpose
Build and test a privacy-first participation system before any monetary reward mechanism is activated.

## Pilot actions
Participants can:
1. clean unwanted email/SMS/message spam;
2. block repeat unwanted senders;
3. unsubscribe only from legitimate, verified commercial senders;
4. report suspected commercial spam to ACMA where appropriate;
5. report suspected scams to Scamwatch where appropriate;
6. never click suspicious links or open suspicious attachments as part of the cleanup.

## Reward integrity
- Deleted spam does not create money by itself.
- HAM Points in the pilot are activity points only and have no cash or crypto value.
- Official complaint/report volume is never rewarded and does not increase HAM Points.
- A future reward pool may be funded from disclosed sources such as CryptoWorldz treasury allocations, sponsors, participating businesses, campaign donations, and legitimate privacy-safe useful-compute revenue.
- Any future conversion to $WLDZ, cash, donations, or other benefits must be separately activated, disclosed, audited, and legally reviewed.
- Proposed participant choice once rewards are live: KEEP / DONATE / 50:50 SPLIT.

## Privacy
- Pilot activity data stays in the participant’s browser local storage.
- Do not upload email bodies, SMS contents, contact lists, credentials, private keys, seed phrases, attachments, or personal information to a public blockchain.
- Future Proof-of-Cleanup must use privacy-safe summaries, attestations, and/or hashes rather than message contents.

## Helpful Action Mining roadmap
Phase 1 — Local Spring Clean timer + counters + pilot HAM points.
Phase 2 — Privacy-safe proof receipts and optional account verification.
Phase 3 — Optional useful-compute HAM Nodes for legitimate anti-spam analysis and other approved computational work.
Phase 4 — Audited reward pool and transparent participant distribution.
Phase 5 — Australia National Spam2Ham Day, then evaluate expansion toward World Spam2Ham Day.

## Official Australian safety/reporting references
- ACMA dealing with spam: https://www.acma.gov.au/dealing-with-spam
- Scamwatch report a scam: https://www.scamwatch.gov.au/report-a-scam

## Pilot HAM point formula
This formula is for testing engagement only:
- unwanted messages cleaned: +1 each
- repeat senders blocked: +2 each
- legitimate subscriptions safely unsubscribed: +1 each
- completed 60-minute Sunday session: +100 completion bonus
- official spam/scam reports: +0 points

No monetary value is implied.

## Release rule
Do not call cash/crypto rewards “live” until funding source, legal/compliance treatment, anti-abuse controls, privacy architecture, payout rules, and public terms are all operational and verified.


## Spam Coin Rescue™ — Solana pilot track

Spam2Ham now has a second, separate cleanup track for unwanted wallet clutter on Solana. This does **not** change the privacy rules for email/SMS cleanup.

### Core truth
A spam token is not automatically money. Spam2Ham must never pretend worthless tokens can magically become $WLDZ, donations or gifts.

There are four honest outcomes:
1. **KEEP / REVIEW** — the token may be legitimate or valuable; do not auto-clean it.
2. **SALVAGE / SWAP** — if a live executable market route exists, show the quote, slippage, fees and minimum output before the wallet signs.
3. **BURN + CLOSE** — if an unwanted token has no useful route but its token account can be safely cleaned, burn the token balance using the canonical token program, then close the zero-balance token account and return eligible account lamports to the user.
4. **IGNORE / HIDE** — if safety cannot be established, do nothing. Unknown tokens must never force interaction.

An already-empty eligible token account can be closed without a burn.

### Useful-value choice after cleanup
Any value actually recovered is separated from the cleanup action and shown to the user before another transaction is built.

Planned choices:
- **KEEP** — keep recovered SOL/USDC or other supported quote asset.
- **WORLDZ** — optionally acquire an eligible verified Worldz asset only after that asset has a verified mainnet mint, real liquidity and an executable route.
- **DONATE** — user explicitly chooses an approved DonateWorldz destination.
- **SHARE** — send a user-chosen amount to another wallet.
- **CHRISTMAS / GIFT** — create a transparent user-approved gift transfer or gift allocation.

No destination is preselected. No donation, token purchase, transfer or gift can be hidden inside a cleanup transaction.

### HAM Node Mesh™
The production architecture is split into narrowly scoped nodes/services:

**1. Inventory Node**
- Read public Solana ownership data.
- Discover SPL Token and Token-2022 accounts.
- Record mint, token account, balance, decimals, state and account lamports.
- Current pilot: Solana RPC `getTokenAccountsByOwner`.

**2. Trust & Market Signal Node**
- Resolve tokens by mint address rather than name/symbol.
- Use Jupiter token verification, organic score, holder/liquidity/audit signals as evidence — never as a single automatic verdict.
- Never open URLs embedded in suspicious token metadata.

**3. Route & Value Node**
- Ask for a fresh executable quote only after the user selects a token for salvage.
- A displayed price is not enough; no route means no claim of recoverable trading value.
- Calculate slippage, minimum output, network cost and net result.

**4. Safe Execution Node**
- Allow-list the exact Solana programs and instruction types Spam2Ham may build.
- Inspect Token-2022 extensions before any action.
- Use `BurnChecked` / canonical burn instructions where appropriate.
- Close only eligible zero-balance accounts.
- Simulate every transaction before signature.
- Display every instruction, destination, expected token delta, SOL delta and fee.
- Wallet signs locally; Spam2Ham never receives a seed phrase or private key.

**5. Worldz Choice Router**
- Starts only after cleanup/salvage is confirmed.
- Builds a separate explicit transaction for KEEP / WORLDZ / DONATE / SHARE / CHRISTMAS.
- Must never turn a cleanup signature into permission for a second economic action.

**6. Proof Node**
- Confirm the transaction on-chain.
- Record public signature, mint/token-account actions, actual balance deltas and disclosed fees.
- Proof receipts contain no seed phrases, private keys or private message contents.

### Pilot scanner
The first deployed scanner is deliberately read-only:
- public wallet address input;
- Solana mainnet SPL + Token-2022 account inventory;
- Jupiter Tokens API V2 market/verification context;
- zero-balance account candidates and account-lamport estimates;
- no transaction construction;
- no wallet signature;
- no persistent scan storage.

Token-2022 accounts are marked for advanced extension review before execution.

### Fail-closed safety rules
- Receiving an unsolicited token does not by itself mean a wallet is compromised.
- If uncertain, ignore/hide it rather than interact.
- Never trust token names, logos, descriptions or embedded links.
- Never auto-burn or auto-swap.
- Never expose API keys in the browser.
- Never use a single price/verification provider as the sole safety decision.
- Never call estimated token value "recoverable" until an executable quote exists.
- Never call account lamports "recovered" until the close transaction confirms.
- Never bundle unrelated approvals, transfers, delegate grants or authority changes into cleanup.
- Never sign on behalf of the user.
- Standard SPL Token and Token-2022 are separate execution paths.
- Unsupported Token-2022 extensions fail closed.
- Mainnet execution stays disabled until transaction simulation, instruction allow-listing, extension inspection, wallet preview and post-transaction proof are all verified.

### Node / provider strategy
Production should use a dedicated Solana RPC provider as primary and a second independent provider for failover / verification. Public Solana RPC is acceptable for a low-rate read-only pilot, not a production dependency.

Market data / route context:
- Jupiter Tokens API V2: mint metadata, verification, organic score, holder count, liquidity and audit signals.
- Jupiter Price / Swap V2: price context and executable route/transaction building when explicitly requested.

Canonical account truth:
- Solana RPC account and token-program state.
- Confirmation / proof from Solana transaction data.

Optional indexed inventory:
- Helius DAS / Token APIs can be added behind the server for high-volume wallet inventory, SPL + Token-2022 metadata and indexed ownership. Provider keys remain server-side.

### External technical references used for this design
- Solana — SPL Token Basics: https://solana.com/docs/tokens/basics
- Solana — Burn Tokens: https://solana.com/docs/tokens/basics/burn-tokens
- Solana — Close Token Account: https://solana.com/docs/tokens/basics/close-account
- Solana — Token-2022 Extensions: https://solana.com/docs/tokens/extensions
- Solana — Permanent Delegate: https://solana.com/docs/tokens/extensions/permanent-delegate
- Solana — Transfer Fees: https://solana.com/docs/tokens/extensions/transfer-fees
- Solana RPC — getTokenAccountsByOwner: https://solana.com/docs/rpc/http/gettokenaccountsbyowner
- Solana RPC — transaction simulation structures: https://solana.com/docs/rpc/json-structures
- Jupiter Tokens API V2: https://developers.jup.ag/docs/tokens/token-information
- Jupiter Swap API V2: https://developers.jup.ag/docs/swap/
- Phantom — spam token safety: https://help.phantom.com/articles/51665009279251
- Phantom — report spam: https://help.phantom.com/articles/38409446731539
- Helius — token APIs: https://www.helius.dev/solana-token-apis
