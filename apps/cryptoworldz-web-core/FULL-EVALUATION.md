# CryptoWorldz Multi-Site Full Evaluation

Completed: 4 August 2026, Australia/Sydney

## Final result

The shared multi-domain website package is complete for the next evaluation stage.

The only remaining content input is the public information and links for the previously launched tokens. Once those records are added and verified, the package is ready for Hostinger deployment using the existing hosting plan. Hostinger Horizons credits are not required.

## Website experiences complete

- CryptoWorldz total market centre
- Purple Diamond Crew verified live-token directory
- OneWorldz mission headquarters
- ImpactBased portal
- SolWorldz
- EthWorldz
- BaseWorldz
- BNBWorldz
- XRPWorldz
- SuiWorldz
- HyperWorldz
- RobinWorldz
- BitcoinWorldz / BitWorldz
- HodlerWorldz
- Robin Hood Law / RecoverYourDebt information portal
- LearnWorldz
- Safe test-domain route

The current configuration contains 33 root and `www` domain routes.

## Live-token system complete

PurpleDiamondCrew.com is the verified directory for previously launched ecosystem tokens. CryptoWorldz links directly to it.

Each token record can display:

- Name, ticker and blockchain World
- Logo and project purpose
- Contract and pair addresses
- Launch, trade and DEX Screener links
- Explorer and GeckoTerminal links
- Website, X, Telegram, Facebook, YouTube and TikTok links
- Launch provider and launch model
- Creator initial buy
- Trading fee and fee split
- Real liquidity information
- Verification status
- Embedded DEX chart

## Database evaluation

Verified against the active `CryptoWorldz-Bot` Supabase project:

- `ecosystem_worlds`: 11 records
- `impact_projects`: 1 record
- `ecosystem_tokens`: 0 records awaiting the supplied live-token information
- `launch_updates`: 0 records
- RLS enabled on the public registry tables
- Browser access limited to public `SELECT`
- Duplicate contract addresses prevented per chain
- Record `updated_at` timestamps maintained automatically
- Live status requires a contract address, verification timestamp and a market/trade reference

A behavioral database test inserted a private temporary record, confirmed that the update timestamp advanced, confirmed that an invalid live record was rejected, and removed all evaluation records. Final evaluation-record count: `0`.

The behavioral test identified that PostgreSQL `now()` remains constant during one transaction. The trigger was corrected to use `clock_timestamp()` and then passed the repeated test.

Tracked migrations:

- `supabase/migrations/20260804041500_harden_live_token_registry_for_deployment.sql`
- `supabase/migrations/20260804043000_fix_registry_updated_at_clock.sql`

## Security and Hostinger evaluation

- Only the Supabase publishable key is present in frontend files.
- No service-role key or secret key is present.
- Public URLs are protocol-validated before rendering.
- Public text is HTML-escaped before insertion.
- Content Security Policy permits only the required Supabase and DEX Screener connections.
- No wallet private keys or recovery phrases are requested or stored.
- The live Zed Node.js deployment remains separate and is not overwritten by the static website package.
- Hostinger `.htaccess` routing sends unknown paths to `index.html`.
- Hostinger `.htaccess` applies security headers, compression and static-asset caching.
- The portable `_headers` file remains available for compatible static hosts.

Supabase security and performance advisors were run after the schema changes. The registry tables produced no new security errors. Existing informational notices concern other private Zed tables with RLS and no public policies, plus indexes that have not yet recorded usage.

## Automated evaluation

The repeatable evaluator checks required files, JavaScript syntax, domain routing, supported website modes, live-token verification gates, cross-site links, Hostinger routing, CSP requirements and secret-key markers.

Command:

```bash
npm run verify:web
```

Evaluation result:

```text
CryptoWorldz web-core evaluation passed: 33 domain routes, 11 required files.
```

The GitHub Actions workflow is configured to run the evaluation and create:

- `cryptoworldz-web-core-deploy.zip`
- `cryptoworldz-web-core-deploy.sha256`

The deployment ZIP contains the exact static package for Hostinger, including `.htaccess`.

## Remaining input

Provide the previously launched token links and any available public details listed in `TOKEN-INTAKE.md`.

After those records are verified and inserted:

1. Run the same complete evaluation.
2. Confirm the token count and directory publication rules.
3. Generate the final deployment ZIP.
4. Upload or Git-deploy it through the existing Hostinger hosting plan.
5. Attach the domains, enable HTTPS and leave `cryptobotz.cryptoworldz.xyz` on its current Node.js Web App.

No additional website generation, preview approval or Horizons-credit purchase is required.
