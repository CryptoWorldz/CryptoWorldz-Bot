# CryptoWorldz Multi-Site Full Evaluation

Completed: 4 August 2026, Australia/Sydney

## Final result

The shared multi-domain website package and Purple Diamond Crew token register are complete for deployment evaluation.

The ten supplied Purple Diamond Crew mints have been checked, inserted into the active Supabase registry and connected to the canonical project website, X page and Telegram group. Hostinger Horizons credits are not required.

## Website experiences complete

- CryptoWorldz total market centre with a direct Purple Diamond Crew directory link
- Purple Diamond Crew verified current-and-historical token directory
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

## Purple Diamond Crew register complete

PurpleDiamondCrew.com now has a dedicated application that reads only the verified Purple Diamond Crew project and its public token records.

Canonical links applied to all ten records:

- `https://purplediamondcrew.com`
- `https://x.com/PDCrew`
- `https://t.me/PurpleDiamondCrew`

Registered mints:

1. PDC — `F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump`
2. PDC1 — `PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw`
3. PDC1-2 — `PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52`
4. PDCMAGA — `7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump`
5. PDCshare — `PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE`
6. PurpleDC — `9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf`
7. PurpleOg — `DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump`
8. PCC1 legacy — `DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv`
9. INVEST — `VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC`
10. LMTD — `Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY`

Directory status totals:

- 10 verified unique contracts
- 5 paused / historical records
- 5 archived records
- 10 canonical website links
- 10 canonical X links
- 10 canonical Telegram links

The directory does not falsely describe historical tokens as currently liquid or tradable. No supplied token had a current Jupiter swap route or DEX Screener pair during verification on 4 August 2026. Existing Pump.fun and RevShare launch pages were retained where confirmed.

## Database evaluation

Verified against the active `CryptoWorldz-Bot` Supabase project:

- `ecosystem_worlds`: 11 records
- `impact_projects`: 2 records, including Purple Diamond Crew
- `ecosystem_tokens`: 10 verified Purple Diamond Crew records
- `launch_updates`: 0 records
- RLS enabled on the public registry tables
- Browser access limited to public `SELECT`
- Duplicate contract addresses prevented per chain
- Record `updated_at` timestamps maintained automatically
- Live status requires a contract address, verification timestamp and a market/trade reference
- Historical directory publication requires a contract address and verification timestamp

The PDC1-2 and INVEST records contain the owner-supplied wallet `DgsWus6bxAMck9eXmS7V3tVNp8n7DinPQrEVexdju94j`, which also appears as the indexed developer wallet for those mints.

Tracked database migrations:

- `supabase/migrations/20260804041500_harden_live_token_registry_for_deployment.sql`
- `supabase/migrations/20260804043000_fix_registry_updated_at_clock.sql`

## Security and Hostinger evaluation

- Only the Supabase publishable key is present in frontend files.
- No service-role key or secret key is present.
- Public URLs are protocol-validated before rendering.
- Public text is HTML-escaped before insertion.
- Historical records display an explicit warning that verified existence does not imply current liquidity or tradability.
- Content Security Policy permits only the required Supabase and DEX Screener connections.
- No wallet private keys or recovery phrases are requested or stored.
- Telegram account-transfer details are not published in token metadata.
- The live Zed Node.js deployment remains separate and is not overwritten by the static website package.
- Hostinger `.htaccess` routing sends unknown paths to `index.html`.
- Hostinger `.htaccess` applies security headers, compression and static-asset caching.

## Automated evaluation

The repeatable evaluator checks required files, JavaScript syntax, domain routing, supported website modes, PDC project selection, verified historical statuses, canonical links, Hostinger routing, CSP requirements and secret-key markers.

Command:

```bash
npm run verify:web
```

Expected successful output:

```text
CryptoWorldz web-core evaluation passed: 33 domain routes, 12 required files.
```

The GitHub Actions workflow generates:

- `cryptoworldz-web-core-deploy.zip`
- `cryptoworldz-web-core-deploy.sha256`

The deployment ZIP contains the exact static package for Hostinger, including `.htaccess`.

## Deployment boundary

The build and registry are ready. The remaining actions occur in the existing Hostinger hosting account:

1. Generate or download the final deployment artifact.
2. Upload or Git-deploy the web-core package.
3. Attach the domains to the shared deployment.
4. Enable HTTPS.
5. Leave `cryptobotz.cryptoworldz.xyz` on its current Node.js Web App.

No additional website generation, preview approval, Horizons-credit purchase or second hosting plan is required.
