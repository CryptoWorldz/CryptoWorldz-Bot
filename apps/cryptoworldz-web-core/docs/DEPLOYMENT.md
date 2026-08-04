# Deployment Map

## One codebase, multiple domains

The static app detects its domain using `config/worlds.js`. Hostinger Horizons credits are not required. Use the existing Hostinger hosting plan.

| Domain | Experience |
|---|---|
| `cryptoworldz.xyz` | Total CryptoWorldz market centre |
| `purplediamondcrew.com` | Verified previously launched token directory |
| `oneworldz.com` | Mission headquarters |
| `impact.oneworldz.com` / `impactbased.oneworldz.com` | ImpactBased public portal |
| `law.oneworldz.com` | Robin Hood Law / RecoverYourDebt information portal |
| `learn.oneworldz.com` | LearnWorldz education portal |
| `test.oneworldz.com` | Safe pre-production market route |
| `solworldz.xyz` | SolWorldz dedicated DEX page |
| `ethworldz.xyz` | EthWorldz dedicated DEX page |
| `baseworldz.xyz` | BaseWorldz dedicated DEX page |
| `bnbworldz.xyz` | BNBWorldz dedicated DEX page |
| `xrpworldz.xyz` | XRPWorldz dedicated DEX page |
| `suiworldz.xyz` | SuiWorldz dedicated DEX page |
| `hyperworldz.xyz` | HyperWorldz dedicated DEX page |
| `robinworldz.xyz` | RobinWorldz dedicated DEX page |
| `bitcoinworldz.xyz` / `bitworldz.xyz` | BitcoinWorldz dedicated DEX page |
| `hodlerworldz.xyz` | Read-only portfolio placeholder |

## Build verification

Run from the repository root:

```bash
npm run verify:web
```

The expected result is:

```text
CryptoWorldz web-core evaluation passed: 33 domain routes, 11 required files.
```

The GitHub Actions workflow also creates:

- `cryptoworldz-web-core-deploy.zip`
- `cryptoworldz-web-core-deploy.sha256`

## Hostinger deployment

1. Back up the existing `cryptoworldz.xyz`, `purplediamondcrew.com` and `solworld.fun` websites before changing document roots or files.
2. Keep `cryptobotz.cryptoworldz.xyz` on its existing Node.js Web App. Never upload this static package over Zed.
3. Deploy the contents of `cryptoworldz-web-core-deploy.zip` to `test.oneworldz.com` first.
4. Ensure hidden files are included so `.htaccess` is uploaded.
5. Confirm `index.html`, `assets`, `config`, `404.html` and `.htaccess` are in the domain document root.
6. Confirm HTTPS is active.
7. Confirm the Supabase registry loads and no browser console errors occur.
8. Attach each production domain to the same static package or an exact copy.
9. Confirm root and `www` DNS records resolve to the selected Hostinger website.
10. Test the root page, an unknown route, mobile layout, token links and embedded DEX charts.

## Hostinger behavior included

The included `.htaccess` provides:

- Unknown-route fallback to `index.html`
- Directory listing protection
- Security headers
- Content Security Policy
- Compression
- Static-asset caching

The included `404.html` provides an additional static-host fallback. The `_headers` file supports compatible non-Apache static hosts.

## Live-token publication workflow

1. Verify the public token information and official links.
2. Add the token record to `ecosystem_tokens`.
3. Set the correct World, chain ID and contract address.
4. Add at least one DEX Screener URL, pair address or trade URL.
5. Add the verification timestamp.
6. Set `launch_status` to `live` only after verification.
7. Keep `is_public` enabled for public listings.
8. Run `npm run verify:web` again.
9. Confirm PurpleDiamondCrew.com displays the token and CryptoWorldz links to the directory.

Every connected website reads the same registry and updates without rebuilding the website code.
