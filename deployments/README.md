# ChatGPT Production Deployment Requests

Files in this directory are small release-request records. They do not contain credentials or website code.

## PurpleDiamondCrew.com

After the protected workflow and GitHub Environment are approved, an explicit owner instruction to deploy can be recorded by creating or updating:

`deployments/purplediamondcrew.request`

A change to that file on `main` triggers `.github/workflows/deploy-purplediamondcrew.yml`.

The deployment still pauses at the protected `purplediamondcrew-production` environment. The owner must press **Approve and deploy** before the environment secrets become available and before Hostinger is changed.

Recommended request format:

```text
site=purplediamondcrew.com
source_commit=<approved main commit SHA>
requested_by=JayJayTeamDev
requested_at=<Australia/Sydney timestamp>
confirmation=LIVE DEPLOYMENT APPROVED
```

Never place FTP details, passwords, tokens, private keys, recovery phrases or API secrets in a deployment request file.
