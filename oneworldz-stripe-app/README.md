# OneWorldz Full Support

Private Stripe Dashboard app scaffold for the OneWorldz support system.

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

## Build stages

- [x] Private Stripe App manifest created
- [x] Dashboard-wide OneWorldz support control view created
- [ ] Add production icon asset
- [ ] Generate/install Stripe Apps CLI project dependencies
- [ ] Confirm Stripe Connect eligibility and platform configuration for the OneWorldz fundraising model
- [ ] Create compliant connected-account onboarding flow
- [ ] Add Reagan & Children connected account
- [ ] Add Community Impact connected account
- [ ] Add Davis Family connected account
- [ ] Verify each payout bank inside Stripe
- [ ] Create one-time contribution checkout/payment links per stream
- [ ] Add receipts, metadata and reporting
- [ ] Connect OneWorldz GPT routing to the verified payment destinations
- [ ] Sandbox test
- [ ] Live verification

## Davis Family

The Davis Family stream is intentionally created without bank details in source code. The approved payout bank must be attached through Stripe's secure payout/onboarding flow before this stream can become LIVE.
