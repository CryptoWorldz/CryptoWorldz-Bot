# WorldzPay™ Provider Access Track — 2026-10-01

Status: **SIDE RAIL / NO PRODUCTION PROVIDER ACTIVATION**

## X Money

Official public information checked on 2026-10-01:

- X Money says it is rolling out to select users in the United States.
- X's public API overview currently documents API categories for accounts/users, posts/replies, Direct Messages, ads, and publisher tools.
- The Cross River Stored Value Account Agreement says X Payment Services may be delivered through APIs, applications, buttons, widgets and commerce services.
- Those references do **not** establish that Worldz currently has an approved X Money payment API, partner contract, production credentials, or a generally available payment endpoint.

Worldz therefore keeps the X Money provider slot at:

`NO_VERIFIED_WORLDZ_PAYMENT_ACCESS`

and the production adapter remains disabled.

Official references:

- https://money.x.com/en
- https://money.x.com/en/i/stored-value-account
- https://help.x.com/en/rules-and-policies/x-api

## Provider activation sequence

Every external payment provider must pass the provider registry before production:

1. Provider selected / official access granted.
2. Official technical documentation verified.
3. Merchant/commercial terms approved.
4. Compliance review approved for the intended countries and products.
5. Credentials configured server-side only.
6. Webhook/callback signature verification implemented.
7. Sandbox or certification tests passed.
8. Treasury destination and multisig governance proven.
9. Reconciliation test proves gross -> external fees -> protected earmarks -> net Worldz-controlled revenue.
10. Explicit treasury/human production approval.

## Treasury activation sequence

WorldzPay settlement stays prepared-only until:

- Worldz Operations Treasury is proven at the required **5-of-10** target;
- the public treasury destination is verified;
- the transaction/proposal hash is bound to the approval envelope;
- provider settlement evidence is reconciled;
- any Legacy Core routing is calculated only from eligible net Worldz-controlled revenue;
- Reserve movement is a separate approved sweep under its **6-of-9** target;
- WorldzProof is produced after a real confirmed settlement.

## Current engineering rule

Build interfaces, simulations, provider readiness, reconciliation, ledgers and approval envelopes now.

Do **not** switch on live provider execution, custody, signing, automatic treasury transfers, or implied provider partnerships from the side rail.
