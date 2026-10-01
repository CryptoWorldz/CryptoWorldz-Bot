# REXSECURE ULTIMATE™

**Security for Your Community**

REXSECURE ULTIMATE™ is the Worldz FullBuild Telegram security layer. It combines local moderation with external threat intelligence and cross-community controls.

## Security layers

1. **REX Network Shield** — a Worldz-owned Telegram-ID threat registry for confirmed blocks, watches and cleared profiles.
2. **CAS check** — queries the Combot Anti-Spam API on join/first activity. Commercial use must retain visible `Powered by CAS` attribution: https://cas.chat
3. **Number Match** — new members are restricted until they complete the existing REX number challenge.
4. **External Bot Guard** — newly added bots are removed unless they are explicitly trusted.
5. **Identity Guard** — detects display-name/username impersonation of trusted identities and can quarantine.
6. **Link Guard** — per-group domain allow/block rules.
7. **Anti-Flood** — rate control with stricter limits in Under Attack mode.
8. **Pattern Guard** — admins can capture a scam/spam message pattern; highly similar future messages are removed and the sender is quarantined.
9. **Evidence Reports** — admins can record a profile report for later review instead of turning a single unverified report into a global ban.
10. **Under Attack mode** — temporary strict posture without destroying the group's normal settings.

## Trust policy

Automatic permanent network bans require a high-confidence source:
- a current CAS ban, or
- an explicit Worldz owner/network registry block.

A group admin report alone is evidence, not a global ban. This prevents one compromised or malicious admin from poisoning the entire Worldz network.

## Commands

- `/secureguard on|off|status`
- `/rexintel USER_ID`
- `/rexreport USER_ID | reason` or reply to a message with `/rexreport reason`
- `/rexglobalblock USER_ID | reason | optional evidence URL` — Worldz owner only
- `/rexglobalclear USER_ID | reason` — Worldz owner only
- `/rexpatternban reason` — reply to a scam/spam message; bans locally and adds the message pattern
- `/rexunderattack on|off`
- existing REX domain, trust, posture and recovery commands remain available.

## External systems researched

- CAS / Combot Anti-Spam — Telegram-ID threat database/API.
- MissRose — federation ban model.
- Safeguard — portal verification, anti-raid, flood control, trust concepts and message-similarity ban patterns.
- Shieldy — CAPTCHA and anti-spam bot patterns.
- Telegram Bot API — native restrict/ban/delete permissions.

Major Buy Bot is primarily a buy-notification product rather than a security threat database. Public documentation for some named proprietary bots is limited; REX only adopts documented patterns and public APIs, not private data or proprietary code.
