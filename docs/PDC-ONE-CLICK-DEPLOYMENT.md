# PurpleDiamondCrew.com One-Click Production Deployment

Approved design prepared: 5 August 2026, Australia/Sydney.

## Result

This setup allows ChatGPT/GitHub changes to be prepared and validated without Hostinger Horizons credits.

A live deployment can be requested from ChatGPT by updating `deployments/purplediamondcrew.request`. GitHub then validates the website and waits at the protected production environment. The owner presses **Approve and deploy** once before Hostinger files are changed.

The Zed Bot app at `cryptobotz.cryptoworldz.xyz` is not part of this workflow.

## GitHub Environment

Create or update this exact environment:

`purplediamondcrew-production`

### Protection rules

- Required reviewer: `CryptoWorldz` / JayJayTeamDev account
- Prevent self-review: **OFF**
- Wait timer: `0`
- Deployment branches: selected branch `main` only
- Allow administrators to bypass: optional, but not required

Keeping **Prevent self-review OFF** allows the repository owner to press the single **Approve and deploy** confirmation after requesting the deployment.

## Hostinger safety requirement

Create a dedicated FTP account for PurpleDiamondCrew.com only.

Restrict its Hostinger directory to the Purple Diamond Crew website root, normally:

`/domains/purplediamondcrew.com/public_html`

The workflow then uses `/` as the server directory because the FTP account itself is already locked to that domain. Do not use the unrestricted master hosting FTP account.

## Environment secrets

Add these under the `purplediamondcrew-production` environment:

| Secret | Value |
|---|---|
| `PDC_FTP_HOST` | Hostinger FTP host/IP shown in the PurpleDiamondCrew.com FTP Accounts page |
| `PDC_FTP_USERNAME` | Dedicated PurpleDiamondCrew.com FTP username |
| `PDC_FTP_PASSWORD` | Password for that dedicated FTP account |

The workflow also accepts existing generic names `HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USERNAME`, and `HOSTINGER_FTP_PASSWORD`, but the PDC-specific names are safer.

## Environment variables

Add these under the same environment:

| Variable | Exact value |
|---|---|
| `PDC_FTP_PORT` | `21` |
| `PDC_FTP_SERVER_DIR` | `/` |
| `PDC_FTP_ACCOUNT_SCOPE` | `DOMAIN_ONLY` |
| `PDC_DEPLOY_GUARD` | `PURPLEDIAMONDCREW.COM` |

The workflow refuses to deploy when the guard, account scope, branch, credentials, or server directory are missing or unsafe.

## What happens after approval

1. The complete CryptoWorldz web-core tests run.
2. A checksum-protected deployment ZIP is saved as a GitHub artifact.
3. The workflow pauses at `purplediamondcrew-production`.
4. The owner presses **Approve and deploy**.
5. The existing PurpleDiamondCrew.com files are backed up.
6. The approved static package uploads through encrypted FTP.
7. The live homepage, PDC JavaScript, PDC stylesheet and route selection are tested.
8. A failed live check restores the previous website automatically.

## Future ChatGPT deployment command

The owner can say:

> Deploy the approved Purple Diamond Crew update live.

ChatGPT can update `deployments/purplediamondcrew.request` in `main`. The workflow starts automatically and waits for the owner’s GitHub confirmation click.

## Manual GitHub alternative

Open GitHub → Actions → **Deploy PurpleDiamondCrew.com** → **Run workflow**.

Choose:

`DEPLOY PURPLEDIAMONDCREW.COM`

The protected environment approval remains required before the live files are changed.
