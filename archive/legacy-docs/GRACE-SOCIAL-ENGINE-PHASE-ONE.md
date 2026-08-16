# Grace Social Engine — Phase One

Grace stands for **Global Relations, Automation, Communications & Engagement**.
She runs inside the existing Zed-led CryptoWorldz Command Centre. Auto provides the API-cost guardrails.

## Phase One delivered

- Multi-workspace database design for future business customers.
- Social account register for X, Facebook, Instagram, YouTube and TikTok.
- Draft, schedule, approve, reject and calendar workflow.
- Telegram approval buttons.
- Emergency stop, pause/resume and owner-only posting enable controls.
- Monthly API budget enforced before a worker publishes.
- Retry-safe posting queue using `FOR UPDATE SKIP LOCKED`.
- X API publishing adapter using official `POST https://api.x.com/2/tweets`.
- Growth snapshots and publishing-result summaries.
- Protected HTTP endpoints for the future Web/Mini App dashboard.
- Full audit log for account, post, approval, budget and publishing actions.

## Safety defaults

Grace installs with:

- `posting_enabled = false`
- `approval_required = true`
- no social credentials stored in GitHub, Telegram or public database rows
- a default monthly API budget of USD 25
- an owner-only `/pauseall` emergency stop

A post can only reach a platform when all of the following are true:

1. The account is active.
2. Its hosting environment token exists.
3. The post is scheduled and approved.
4. The scheduled time has arrived.
5. Grace posting has been enabled by the owner.
6. Grace and Zed are not paused.
7. Auto's monthly and account budgets approve the estimated cost.

## Telegram controls

```text
/secretary
/draft Title | Caption
/calendar 7
/accounts
/accounts add x | solworldx | SolWorld | @Solworldx
/accounts enable 1
/schedule POST_UUID | 2026-08-06T09:00+10:00 | 1,2,3
/approve POST_UUID
/reject POST_UUID reason
/results 7
/growth
/growth record ACCOUNT_ID FOLLOWERS VIEWS ENGAGEMENTS
/gracebudget 25
/graceenable
/gracedisable
/pauseall
/resumeall
```

Never send an access token through Telegram. `/accounts add` returns the exact Hostinger environment-variable name to create.

## First X account connection

1. Create or approve an X developer App with write permission.
2. Generate a user access token for the X account.
3. Run `/accounts add x | account_key | Display Name | @handle`.
4. Add the returned `GRACE_X_TOKEN_ACCOUNT_KEY` variable in Hostinger.
5. Restart/redeploy the Node application so the secret is available.
6. Run `/accounts enable ACCOUNT_ID`.
7. Create a test draft, schedule it, approve it and confirm Grace remains within the Auto budget.
8. Run `/resumeall` if paused, then `/graceenable`.

## Protected dashboard API

Set `GRACE_API_SECRET` in Hostinger. Send it in the `x-grace-api-secret` request header.

- `GET /grace/health`
- `GET /api/grace/status`
- `GET /api/grace/accounts`
- `GET /api/grace/calendar?days=7`

The next dashboard update can consume these endpoints through Telegram Mini App authentication rather than exposing the API secret to browsers.
