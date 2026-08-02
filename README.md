# CryptoWorldz Zed Bot 3.0

Zed is the webhook-driven Telegram Command Centre for CryptoWorldz. Version 3.0 preserves Legend registration, public Solana-wallet registration, points, missions, submissions, approvals, broadcasts, the secured OpenAI Action and Hostinger deployment.

Fast mission creation: `/raid https://x.com/CryptoWorldzX/status/123` or `/raid <link> | 10 | 24h`. Only HTTPS URLs are accepted; duplicate links are rejected. X, Telegram, YouTube, TikTok, Instagram, Facebook, Reddit, Discord and general websites receive platform-specific defaults. `/newmission` remains available for custom missions.

Zed is the Telegram command centre for CryptoWorldz. The production service runs at `https://cryptobotz.cryptoworldz.xyz` and uses the existing Supabase project `hknymhhyqldtzmplzuzh`.

## Public commands

`/start`, `/help`, `/register`, `/profile`, `/points`, `/leaderboard [daily|weekly|monthly|all]`, `/raid`, `/raaiiidd`, `/missions`, `/rewards`, `/wallet`, `/impact`, `/donate`, `/cancel`, `/community`, `/website`.

- `/start` — open Zed and register or refresh a Legend Profile.
- `/register` — register a Legend Profile.
- `/profile` — show rank, points, completed missions, wallet and earned rewards.
- `/points` — show Legend Points and rank.
- `/leaderboard` — show the Top 25 Legends.
- `/raid` or `/raaiiidd` — show the newest active mission from Supabase.
- `/missions` — list every active mission, newest first.
- `DONE` or `✅ DONE` — submit the newest active mission for review.
- `/wallet [public_address]` — connect a public Solana wallet.
- `/cancel` — cancel pending wallet registration.
- `/community` — show configured CryptoWorldz community links.
- `/website` — show the CryptoWorldz website or pre-launch message.
- `/impact` or `/donate` — open the featured Reagan GoFundMe impact mission and social links.
- `/help` — show the public command menu.

## Admin commands

Admin Team: `/admin`, `/raid <link>`, `/newmission`, `/editmission`, `/endmission`, `/pending`, `/approve`, `/reject`, `/broadcast`, `/admins`, `/permissions`, `/stats`, `/activity`.

Owner controls: `/addadmin`, `/removeadmin`, `/setrole`, `/setpermission`, `/setpartner`, and `/setkitty`. Roles are least-privilege defaults (`admin`, `moderator`, `recap_manager`, `partner_manager`, `treasury_manager`), and the owner can switch individual permissions on or off without granting unrestricted authority.

## Community Kitty and professional partners

`/kitty` displays owner-configured public Solana addresses for SOL or USDC. Configure one with `/setkitty SOL public_address Label` or `/setkitty USDC public_address Label`. Zed stores public addresses only: never enter a seed phrase or private key. Zed does not custody funds, initiate transfers, or award Points merely because someone submits a transaction signature.

Contribution records and automatic approval rules are prepared in Supabase. Automatic Points must remain disabled until the claimed transaction and recipient can be verified on-chain. Social tasks such as X likes or comments remain manually reviewed unless a trustworthy platform verification method is integrated.

Professional collaborators can be added with `/setpartner telegram_id recap_manager|partner_manager|treasury_manager | Name | Organization`. This supports carefully scoped roles for recap publishing, approved partner missions/reporting, and treasury reconciliation. Direct bot-to-bot automation requires the partner service's authenticated API or webhook; Zed does not trust ordinary chat messages as proof.

Owner only: `/addadmin telegram_id`, `/removeadmin telegram_id`, and `/points telegram_id amount`. Set one permanent `OWNER_TELEGRAM_ID`; it cannot be removed. `ADMIN_TELEGRAM_IDS` remains the comma-separated bootstrap/fallback list, while managed admins persist in Supabase.

Admin commands require the sender's Telegram ID in `ADMIN_TELEGRAM_IDS`. They are deliberately excluded from the public `/help` menu.

- `/newmission Title | Platform | Reward Points | Link | Description | Instructions`
- `/editmission mission_id field | new value`
- `/endmission mission_id`
- `/approve submission_id`
- `/reject submission_id reason`
- `/points telegram_id amount`
- `/broadcast Your message here`
- `/confirmbroadcast` or `/cancelbroadcast`

Mission edits allow only `title`, `description`, `platform`, `link`, `instructions`, `reward_points` and `status`. Broadcasts use a two-step confirmation, rate limiting and per-recipient failure handling.

## Environment variables

Required for startup:

- `BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for the secured command API:

- `ADMIN_API_TOKEN` — long random bearer token.
- `ALLOWED_CHAT_IDS` — comma-separated Telegram chat IDs.

Feature configuration:

- `ADMIN_TELEGRAM_IDS` — comma-separated Telegram admin user IDs.
- `OWNER_TELEGRAM_ID` — permanent primary owner ID for team management and point adjustments.
- `AUTO_APPROVE_MISSION_CLAIMS=false`
- `COMMUNITY_TELEGRAM_URL`
- `COMMUNITY_X_URL`
- `COMMUNITY_WEBSITE_URL=https://CryptoWorldz.xyz`
- `COMMUNITY_ANNOUNCEMENTS_URL`
- `COMMUNITY_SUPPORT_URL`
- `WEBSITE_URL=https://CryptoWorldz.xyz`
- `WEBSITE_LAUNCHED=false`
- `TELEGRAM_WEBHOOK_URL=https://cryptobotz.cryptoworldz.xyz/telegram-webhook`
- `PORT=3000`
- `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`
- `SOLANA_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

Use `.env.example` as the variable list. Never commit a real environment file, token, private key, service-role key, wallet seed phrase or secret.

## Database safety

Use only Supabase project `hknymhhyqldtzmplzuzh`. Apply `supabase/migrations` in timestamp order. Zed 3.0 migrations are additive: existing users, wallets, points, missions, submissions and legacy rewards are retained. New server-only tables have RLS enabled and public roles revoked.

The migration in `supabase/migrations` is additive and preserves existing users, wallets, missions, submissions, rewards and history. It provides:

- unique mission claims on `(mission_id, telegram_id)`;
- RLS on all Zed tables with server-only service-role access;
- an atomic `approve_mission_completion` function that awards once;
- an atomic `adjust_legend_points` function that records every change;
- mission submission, reward and history ledgers.

`AUTO_APPROVE_MISSION_CLAIMS` defaults to `false`, so DONE claims stay pending until an admin runs `/approve`.

## Local verification

Run `npm run verify` and `npm audit --audit-level=high`.

```bash
npm ci
npm run verify
npm audit --audit-level=high
```

Tests use Node's built-in test runner and mocked repositories. They do not call live Telegram or Supabase services.

## Deployment

Run `npm ci` then `npm start`. `index.js` calls `app.listen()` immediately without a `require.main` guard. Keep the HTTPS Telegram webhook at `https://cryptobotz.cryptoworldz.xyz/telegram-webhook`. Startup registers BotFather commands automatically.

## Telegram Mini App

Zed 3.0 includes the mobile-first CryptoWorldz Command Centre at:

```text
https://cryptobotz.cryptoworldz.xyz/miniapp/
```

The working release provides Home, Active Raaiiidds, Legend Profile, Leaderboard, Rewards, Wallet status, Community, Governance foundation, SOL/USDC Kitty payment tools and a full Admin Centre. Members can submit DONE with an optional HTTPS proof link. Authorized admins can create Raaiiidds and approve or reject submissions inside Telegram or the Mini App.

The Real-World Impact screen features the GoFundMe campaign **Help Reagan Feed 60 Orphaned Children in Uganda**, with direct GoFundMe, sharing, Facebook, TikTok and YouTube links. Donations are completed outside Zed on GoFundMe; Zed never receives payment details and does not award Legend Points according to donation amount.

Kitty contributions use Solana Pay links and QR codes. Claims are awarded only after Zed verifies a finalized on-chain transfer to the configured public Kitty address. Transaction signatures are single-use. Contribution Points remain disabled until the owner configures and enables an asset rule with Points per unit, a minimum amount and a maximum award. Zed never stores signing authority and never moves funds.

Professional partner roles are invitation-ready foundations only. Do not activate a partner profile, assign an outside person, contact them, or represent them as part of the team until they explicitly agree. All future roles remain owner-controlled and auditable.

Every protected request validates Telegram `initData` server-side using the bot-token HMAC signature, rejects expired data, derives the Telegram ID only from the verified payload and applies rate limits. The browser never receives the Supabase service-role key.

After deployment and testing, configure BotFather:

1. Open `/mybots` and select `@CryptoWorldzBot`.
2. Choose **Bot Settings → Configure Mini App → Enable Mini App**.
3. Set the URL to `https://cryptobotz.cryptoworldz.xyz/miniapp/`.
4. Add the launch name **CryptoWorldz Command Centre**.
5. Upload approved screenshots only after testing inside Telegram.

Do not activate the BotFather menu before the HTTPS page and signed Telegram launch have both been tested.

Rollback: redeploy the previous known-good Git commit. Do not delete production records or reverse additive migrations without a verified backup and an exact recovery plan.

The Hostinger application tracks `main`.

1. Add the environment variables in Hostinger.
2. Apply the checked-in migration to the existing Supabase project.
3. Push the verified commit to `main`.
4. Confirm:

```bash
curl https://cryptobotz.cryptoworldz.xyz/health
curl https://cryptobotz.cryptoworldz.xyz/.well-known/openapi.yaml
```

The health response is:

```json
{"ok":true}
```

## Secured command API

Only the `send_message` action is accepted. Authentication is Bearer-only and the destination must be in `ALLOWED_CHAT_IDS`.

```bash
curl -X POST https://cryptobotz.cryptoworldz.xyz/api/command \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_message",
    "chat_id": "-1001234567890",
    "text": "CryptoWorldz Command Centre test 🤖💜"
  }'
```

Audit logs contain request IDs and approved chat IDs, but never bearer tokens or message contents.

## Custom GPT Action

In the Custom GPT editor, create an Action and import:

```text
https://cryptobotz.cryptoworldz.xyz/.well-known/openapi.yaml
```

Choose API key authentication, Bearer, and enter the same value stored as `ADMIN_API_TOKEN`. Test `sendCryptoWorldzMessage` in Preview. The legacy `ai-plugin.json` format is intentionally not used.
