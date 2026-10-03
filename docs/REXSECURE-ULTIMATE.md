# REXSECURE ULTIMATE™

**Security for Your Community**

REXSECURE ULTIMATE™ is the Worldz FullBuild Telegram security layer. It combines local moderation, external threat intelligence, explainable confidence scoring, human review and appeal controls.

## Security layers

1. **REX Network Shield** — a Worldz-owned Telegram-ID registry for adjudicated blocks, watches and cleared profiles.
2. **Source Policy Registry** — every intelligence source has an explicit weight, freshness rule, maximum automated action and corroboration requirement.
3. **CAS check** — queries the Combot Anti-Spam API. Commercial use retains visible `Powered by CAS` attribution: https://cas.chat
4. **Evidence Ledger** — source, severity, confidence, reference, expiry and evidence are stored separately from the final decision.
5. **Confidence Engine** — combines independent evidence into an explainable 0–100 risk score.
6. **Appeal / False-Positive Guard** — an active appeal freezes permanent escalation above quarantine until human review.
7. **Number Match** — new members are restricted until they complete the existing REX number challenge.
8. **External Bot Guard** — newly added bots are removed unless explicitly trusted.
9. **Identity Guard** — display-name/username similarity creates a signal; Telegram ID remains the stronger identity anchor.
10. **Link Guard** — per-group domain allow/block rules.
11. **Anti-Flood** — rate control with stricter limits in Under Attack mode.
12. **Pattern Guard** — admin-confirmed scam/spam patterns can remove matching messages and temporarily quarantine senders while also creating scored evidence.
13. **Evidence Reports** — admin reports are evidence, not verdicts.
14. **Under Attack mode** — temporary strict posture without destroying normal settings.

## Confidence policy

ReX does **not** permanently ban somebody simply because one database contains their ID.

| Risk score | ReX state | Maximum normal action |
|---:|---|---|
| 0–29 | Clear | Allow + log |
| 30–54 | Watch | Watch / human awareness |
| 55–79 | Quarantine | Temporary quarantine + review |
| 80–94 | Block candidate | Local block only with 2+ independent sources; otherwise quarantine |
| 95–100 | Critical | Permanent Worldz network block only after explicit human adjudication |

### Source rules

- **Worldz owner/security adjudication:** may authorize a permanent network block after review.
- **CAS:** high-quality external intelligence, but **CAS alone is capped at quarantine/review**.
- **Worldz admin report:** evidence only; never a global ban by itself.
- **Pattern match:** temporary/local enforcement signal; requires corroboration for stronger action.
- **Identity similarity:** warning/watch evidence; never proof of identity by itself.
- **Local behaviour:** useful telemetry, but not a Worldz-wide verdict.

Scoring uses source weight plus evidence severity and source confidence, then combines independent signals. The score is an action recommendation, not a claim that a person is guilty of wrongdoing.

## False-positive and appeal policy

- A person can use `/rexappeal REASON` to challenge their own ReX result.
- Only one active appeal may exist for a Telegram ID at a time.
- While an appeal is pending or under review, permanent/local block escalation from the confidence engine is capped at **quarantine**.
- A granted appeal dismisses active Worldz evidence and records the profile as **cleared**.
- Evidence is not silently deleted; its review history remains auditable.
- A new independent future signal may create a new assessment after a previous clearance.
- Group admins may report evidence, but cannot poison the global network registry with an unreviewed allegation.

## Commands

- `/secureguard on|off|status`
- `/rexintel USER_ID` — risk score, band, evidence sources and recommended action
- `/rexreport USER_ID | reason` or reply with `/rexreport reason`
- `/rexappeal REASON` — appeal your own result
- `/rexappeals` — Worldz owner: active appeal queue
- `/rexresolve APPEAL_ID | grant|deny | review note` — Worldz owner
- `/rexglobalblock USER_ID | reason | optional evidence URL` — Worldz owner only; refused while an appeal is active
- `/rexglobalclear USER_ID | reason` — Worldz owner only
- `/rexpatternban reason` — reply to confirmed scam/spam; local action + pattern evidence
- `/rexunderattack on|off`
- existing REX domain, trust, posture and recovery commands remain available.

## Production data model

- `secureguard_intel_sources` — source trust policy.
- `secureguard_evidence` — active/dismissed/expired evidence.
- `secureguard_assessments` — immutable explainable risk snapshots.
- `secureguard_appeals` — pending/reviewed appeal lifecycle.
- `secureguard_threat_profiles` — adjudicated Worldz watch/block/clear state.
- `secureguard_reports` — human-submitted reports.
- `secureguard_events` — operational moderation log.

## External systems researched

- CAS / Combot Anti-Spam — Telegram-ID threat database/API.
- MissRose — federation ban model.
- Safeguard — portal verification, anti-raid, flood control, trust concepts and message-similarity ban patterns.
- Shieldy — CAPTCHA and anti-spam bot patterns.
- Telegram Bot API — native restrict/ban/delete permissions.

REX adopts documented patterns and public APIs only. Third-party intelligence remains a source, not an unquestionable verdict.
