# CryptoWorldz Bot

Secure Telegram bot and ChatGPT Action command endpoint for the CryptoWorldz Bot Command Centre.

## Required environment variables

- `BOT_TOKEN` — Telegram bot token.
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase key.
- `ADMIN_API_TOKEN` — Long random token used only in the `Authorization: Bearer ...` header.
- `ALLOWED_CHAT_IDS` — Comma-separated Telegram chat IDs approved to receive messages.
- `PORT` — Optional. Defaults to `3000`.

Example:

```env
BOT_TOKEN=replace_in_hosting_environment
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace_in_hosting_environment
ADMIN_API_TOKEN=use-a-long-random-secret
ALLOWED_CHAT_IDS=-1001234567890,123456789
PORT=3000
```

Never commit real secrets, API keys, Telegram tokens, seed phrases, private keys, or service-role keys.

## Deployment

1. Add the environment variables in the hosting dashboard.
2. Deploy the repository.
3. Confirm the health endpoint:

```bash
curl https://cryptobotz.cryptoworldz.xyz/health
```

Expected response:

```json
{"ok":true}
```

## Test the command endpoint

```bash
curl -X POST https://cryptobotz.cryptoworldz.xyz/api/command   -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN"   -H "Content-Type: application/json"   -d '{
    "action": "send_message",
    "chat_id": "-1001234567890",
    "text": "CryptoWorldz Command Centre test 🤖💜"
  }'
```

The chat ID must exist in `ALLOWED_CHAT_IDS`.

## Custom GPT Action setup

1. Open the Custom GPT editor.
2. Open **Actions**.
3. Import:

```text
https://cryptobotz.cryptoworldz.xyz/.well-known/openapi.yaml
```

4. Set authentication to **API Key**.
5. Choose **Bearer** authentication.
6. Enter the same value stored as `ADMIN_API_TOKEN`.
7. Test `sendCryptoWorldzMessage`.

The legacy `ai-plugin.json` file is intentionally not used.

## Security

- Only `send_message` is supported.
- Authentication is accepted only through the Bearer header.
- Telegram chats must be explicitly listed in `ALLOWED_CHAT_IDS`.
- Audit logs record request IDs and chat IDs, but never tokens or message contents.
- API responses do not expose Telegram errors or secrets.
