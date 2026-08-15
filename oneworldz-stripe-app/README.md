# OneWorldz Full Support

Private Stripe Dashboard app for the OneWorldz support system.

## Owner

- Login/email: JayJayTeamDev@outlook.com
- Parent Stripe account: OneWorldz
- Purpose: keep support streams clearly separated and route each stream only through its approved Stripe/Connect payout configuration.

## Locked support streams

1. Reagan & Children
2. Community Impact
3. Davis Family
4. OneWorldz / JayJayTeamDev Support

## Security rules

- Never commit BSBs, bank account numbers, Stripe secret keys, webhook secrets, identity documents, or private beneficiary data.
- Bank details are entered only through Stripe-hosted secure account/onboarding flows.
- No support stream may silently fall back to the OneWorldz payout bank.
- A stream is not marked LIVE until its connected account, payout destination, checkout/payment link, receipt wording, and live payment test are verified.

## Current app capabilities

- Reads live Stripe Payment Links.
- Reads visible Connect connected accounts.
- Matches Payment Links to OneWorldz funding-stream metadata.
- Detects whether a Payment Link has a connected-account transfer destination.
- Automatically marks Reagan, Community Impact and Davis Family as HOLD when separate payout routing is missing.
- Provides an app settings page that records the routing and secret-handling safety rules.
- Stores no bank details or Stripe secret keys in source.

## Verified live state

See `docs/verified-live-state.md`.

## Build stages

- [x] Private Stripe App manifest created
- [x] Dashboard-wide OneWorldz support control view created
- [x] Stripe Apps package/config structure added
- [x] Read-only authenticated Stripe API client added
- [x] Support-stream routing lock added
- [x] App settings/safety view added
- [x] Current live Payment Link state recorded
- [ ] Add approved 300x300 OneWorldz production icon asset
- [ ] Upload app with Stripe Apps CLI
- [ ] Install app in Stripe sandbox/test mode
- [ ] Confirm Stripe Connect eligibility and platform configuration for the OneWorldz fundraising model
- [ ] Create compliant connected-account onboarding flow
- [ ] Add Reagan & Children connected account
- [ ] Add Community Impact connected account
- [ ] Add Davis Family connected account
- [ ] Verify each payout bank inside Stripe
- [ ] Rebuild/assign contribution links to the verified connected payout routes
- [ ] Add receipts, metadata and reporting
- [ ] Connect OneWorldz GPT routing to the verified payment destinations
- [ ] Sandbox payment tests
- [ ] Live verification

## Davis Family

The Davis Family stream is intentionally created without bank details in source code. The approved payout bank must be attached through Stripe's secure payout/onboarding flow before this stream can become LIVE.
