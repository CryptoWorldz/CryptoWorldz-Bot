# ChatGPT-Controlled Deployment Requests

Files in this directory are release authorisation records. They contain no passwords, API keys, wallet secrets or private financial information.

## No approval is currently recorded

A production request file must not be created until Jason Wright / JayJayTeamDev types exactly:

`APPROVE TOTAL DEPLOYMENT`

## Static Worldz sites

Request file:

`deployments/worldz-static.request`

Supported targets are defined in `.github/workflows/deploy-worldz-static.yml`.

The workflow requires:

- An exact approval line.
- A request commit matching the triggering main commit.
- A matching domain-specific GitHub Environment.
- A domain-restricted FTP account.
- A matching deployment guard.
- Validation, backup, live check and rollback.

## Zed

Zed remains on its existing Hostinger Node service. A merge to `main` may cause Hostinger's connected Git deployment to update Zed. Therefore the master integration branch must not be merged until total deployment approval is recorded and Zed checks have passed.

## Auto

Auto is packaged separately and may be deployed only in SAFE LOCKED MODE. The first Auto production service must not receive a wallet private key, seed phrase or signing secret.

## Secrets

Never place secrets in a request file. Missing production settings must fail closed.
