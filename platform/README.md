# OneWorldz Command Centre v4

This is the clean, isolated runtime for Zed, Grace and Auto. It does not replace or delete the older application. It reuses the existing Supabase tables so the workspace, audit trail and queued records remain intact while the runtime itself starts clean.

## What is enforced

- **ZED** is the Telegram command surface at `@CryptoWorldzBot`.
- **Grace** uses X OAuth 2.0 Authorization Code Flow with PKCE, a confidential client, an exact callback, exact-handle verification, encrypted tokens, ten-minute one-use links and owner approval before publishing.
- Grace publishes original approved text through X API v2 only. It does not automate likes or bulk follows.
- **Auto** is owner-controlled and buy-only. Selling, private keys, seed phrases, signed payloads, wallet rotation, multi-wallet behaviour and artificial volume are rejected before execution.
- Auto cannot execute without every database lock being open and a separate external signer. This service never stores signing secrets.
- Public health routes reveal readiness booleans, not credential values.

## Exact X developer settings

Use one X app and save these values exactly:

| Setting | Required value |
|---|---|
| App permissions | Read and write |
| Type of App | Web App, Automated App or Bot (confidential client) |
| Callback URI / Redirect URL | `https://cryptobotz.cryptoworldz.xyz/grace/oauth/x/callback` |
| Website URL | `https://cryptoworldz.xyz` |
| OAuth credentials | OAuth 2.0 Client ID and OAuth 2.0 Client Secret from that same app |

Do not use the OAuth 1.0 Consumer Key or API Key Secret in the OAuth 2.0 fields. X requires the callback to match exactly; `/grace/`, a missing path segment, or an extra trailing slash is a different URI.

After saving the X app settings:

1. In Telegram, run `/gracestatus`.
2. Run `/connectx 1`.
3. Press that new button once and approve `@CryptoWorldzX` inside X within ten minutes.
4. Return to Telegram and run `/gracestatus` again.

An expired or already-used button must be discarded. Generate one fresh link rather than reopening an old tab.

## Owner publishing flow

Grace cannot silently publish a draft:

1. `/gracequeue 1 | exact post text` creates a preview in `pending_approval`.
2. `/graceapprove POST_ID` records the owner's approval.
3. `/graceon` permits approved, due records to publish.
4. `/graceoff` stops publishing without deleting the queue.
5. `/gracepause` is the emergency stop. `/graceresume` clears the stop but deliberately leaves publishing off until `/graceon`.

The database claim function also requires the post to be approved, the X account to be active and all owner locks to be open. Parallel workers use row locking so a target cannot be claimed twice.

## Environment

Copy `.env.example` to `.env` in the deployment environment and populate it there. Never commit `.env` or send secret values through chat, Telegram, screenshots or source code.

`GRACE_TOKEN_ENCRYPTION_KEY`, `TELEGRAM_WEBHOOK_SECRET` and `OWNER_API_SECRET` should each be independent, randomly generated values. The Supabase service-role key stays server-side only.

## Verify and run

```bash
npm ci
npm run verify
npm start
```

Health checks:

- `GET /health`
- `GET /grace/health`
- `GET /api/owner/status` with `Authorization: Bearer $OWNER_API_SECRET`

Configure Telegram after the HTTPS deployment is reachable:

```bash
npm run configure:telegram
```

That command reads the bot token and webhook secret from the environment, sends them directly to Telegram over HTTPS and prints neither value.

## Database bootstrap

Apply `supabase/migrations/20260808235139_command_centre_v4_bootstrap.sql` once through the normal migration pipeline. It idempotently creates or updates the canonical `CryptoWorldzX` Grace account, forces owner approval on, starts publishing off, and preserves existing records and emergency controls.

## Deployment contract

- Runtime: Node.js 22
- Start command: `npm start`
- Working directory: `platform`
- Public base URL: `https://cryptobotz.cryptoworldz.xyz`
- Health path: `/health`
- Docker builds are supported with `docker build platform` from repository root.

DNS and X OAuth are external control planes. A green build proves the code package; production is only connected after the real domain serves `/health`, the X portal contains the exact callback, and `/gracestatus` reports the approved account connected.
