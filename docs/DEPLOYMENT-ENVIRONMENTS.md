# OneWorldz Deployment Environments

These settings are prepared for the final `APPROVE TOTAL DEPLOYMENT` gate.

The final approval is intended to occur inside ChatGPT. GitHub environment reviewer clicks are therefore not required. Safety is enforced by:

- Exact approval text in a request file committed to `main`.
- Main-branch-only deployment restrictions.
- Domain-specific GitHub Environments.
- Domain-only FTP accounts.
- Exact domain guard variables.
- Automatic validation, backup, health check and rollback.

## Static website environments

Create each environment only when its domain and deployment target have been verified.

| Target | GitHub Environment | `DEPLOY_GUARD` |
|---|---|---|
| Test route | `test-preproduction` | `TEST.ONEWORLDZ.COM` |
| Purple Diamond Crew | `purplediamondcrew-production` | `PURPLEDIAMONDCREW.COM` |
| SolWorldz | `solworldz-production` | `SOLWORLDZ.XYZ` |
| CryptoWorldz | `cryptoworldz-production` | `CRYPTOWORLDZ.XYZ` |
| OneWorldz | `oneworldz-production` | `ONEWORLDZ.COM` |
| ImpactBased | `impactbased-production` | `IMPACTBASED.ONEWORLDZ.COM` |
| Law | `law-oneworldz-production` | `LAW.ONEWORLDZ.COM` |
| Learn | `learn-oneworldz-production` | `LEARN.ONEWORLDZ.COM` |
| EthWorldz | `ethworldz-production` | `ETHWORLDZ.XYZ` |
| BaseWorldz | `baseworldz-production` | `BASEWORLDZ.XYZ` |
| BNBWorldz | `bnbworldz-production` | `BNBWORLDZ.XYZ` |
| XRPWorldz | `xrpworldz-production` | `XRPWORLDZ.XYZ` |
| SuiWorldz | `suiworldz-production` | `SUIWORLDZ.XYZ` |
| HyperWorldz | `hyperworldz-production` | `HYPERWORLDZ.XYZ` |
| RobinWorldz | `robinworldz-production` | `ROBINWORLDZ.XYZ` |
| BitcoinWorldz | `bitcoinworldz-production` | `BITCOINWORLDZ.XYZ` |
| HodlerWorldz | `hodlerworldz-production` | `HODLERWORLDZ.XYZ` |

### Required secrets in every static environment

Use the same secret names with domain-specific values:

- `FTP_HOST`
- `FTP_USERNAME`
- `FTP_PASSWORD`

### Required variables in every static environment

- `FTP_PORT=21`
- `FTP_SERVER_DIR=/`
- `FTP_ACCOUNT_SCOPE=DOMAIN_ONLY`
- `DEPLOY_GUARD=<exact value from the table>`

### Hostinger FTP rule

Create a dedicated FTP account whose allowed Hostinger directory is that one domain's `public_html` root. The workflow expects `/` because the FTP account itself must already be restricted to that root.

Do not place the master hosting FTP account into these environments.

### Environment protection

- Deployment branch: `main` only.
- Required reviewers: none; the exact ChatGPT approval request is the release gate.
- Wait timer: 0.
- Environment URL: the matching HTTPS domain.

## Zed environment

Environment: `zed-production`

Existing Hostinger Node service:

- Hostname: `cryptobotz.cryptoworldz.xyz`
- Startup: `npm start`
- Branch: `main`

Required server-only values remain in Hostinger, not GitHub source:

- `BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OWNER_TELEGRAM_ID`
- `ADMIN_TELEGRAM_IDS`
- `ADMIN_API_TOKEN` where enabled
- `ALLOWED_CHAT_IDS` where the command API is enabled
- Existing community URLs
- `TELEGRAM_WEBHOOK_URL=https://cryptobotz.cryptoworldz.xyz/telegram-webhook`

Auto bridge values added only after Auto health checks pass:

- `AUTO_SERVICE_URL=https://auto.cryptoworldz.xyz`
- `AUTO_INTERNAL_TOKEN=<same strong random value used by Auto>`

Do not add any wallet signing secret to Zed.

## Auto environment

Environment: `auto-production`

Recommended separate Hostinger Node service:

- Hostname: `auto.cryptoworldz.xyz`
- Startup: `npm run start:auto`
- Branch: `main`
- Health path: `/health`

Required server-only values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OWNER_TELEGRAM_ID`
- `AUTO_INTERNAL_TOKEN`
- `AUTO_MODE=safe_locked`
- `AUTO_EXECUTION_ENABLED=false`
- `AUTO_PORT=3100` or the Hostinger-provided `PORT`

Forbidden values:

- `AUTO_WALLET_PRIVATE_KEY`
- `AUTO_WALLET_SEED`
- `AUTO_SIGNER_SECRET`

The Auto service refuses startup if live mode, execution mode or a signing secret is detected.

## Supabase migration gate

Apply only:

`supabase/migrations/20260805080000_diamond_buy_auto_safe_locked.sql`

The migration is additive and creates only Auto server tables. It does not alter existing Zed users, wallets, points, missions, submissions, rewards or governance rows.

Before applying:

1. Export a database backup.
2. Confirm the project ID is `hknymhhyqldtzmplzuzh`.
3. Run the migration review.
4. Apply once.
5. Verify all new tables have RLS enabled and no public grants.
6. Confirm the seeded settings row has zero caps, no signing and execution disabled.

## Chat-triggered static release request

After the final approval, ChatGPT creates or replaces:

`deployments/worldz-static.request`

Example:

```text
target=purplediamondcrew
source_commit=<approved parent commit containing the tested deployment package>
requested_by=Jason Wright / JayJayTeamDev
confirmation=APPROVE TOTAL DEPLOYMENT
```

The release-request commit is intentionally separate from the approved package commit. The workflow rejects the request unless `source_commit` exactly matches the request commit's parent (`HEAD^`). This prevents an untested or moving source revision from being deployed.

## Unavoidable one-time configuration

ChatGPT cannot read or enter private Hostinger passwords. Each domain-specific FTP account and each environment secret must exist before its first deployment.

Missing credentials cause a safe failure. They are never guessed, requested in chat or written to source control.
