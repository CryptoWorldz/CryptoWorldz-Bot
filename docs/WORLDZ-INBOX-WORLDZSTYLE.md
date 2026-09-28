# Worldz Inbox™ + WorldzStyle™ Telegram Messaging

WorldzFullBuild™ now has a private Telegram messaging plane in addition to WorldzCast™, WorldPing™ and G.R.A.C.E.

## Commands
- `/inbox`
- `/dm @username message`
- `/dm owner message`
- `/dmstyle @username PRESET | TITLE | MESSAGE | BUTTON | https://optional-link`
- `/replydm MESSAGE_ID message`
- `/dmsettings on|off`
- `/dmblock @username`
- `/dmunblock @username`
- `/dmdelete MESSAGE_ID`
- `/dmstatus`
- `/worldzstyle`

## Privacy boundary
DMs work only through private ZED chat or the authenticated MiniApp. Exact usernames are required; there is no public member search endpoint. DM tables have RLS enabled and no public policies. Private DM content is never enrolled as a WorldzCast destination.

`telegram_sent` means Telegram accepted the bot API send. Human read status is separate and recorded only when Worldz Inbox is opened/marked read.

## WorldzStyle™
Presets: `worldz`, `dm`, `announcement`, `update`, `launch`, `mission`, `impact`, `proof`, `alert`, `celebration`.

Format: `PRESET | TITLE | MESSAGE | BUTTON LABEL | https://optional-link`

Plain legacy WorldzCast/WorldPing text remains valid.
