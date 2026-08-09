# Worldz Deployment Acceptance Contract

Owner: JayJayTeamDev
Status: HARD GATE — no production rollout may be called successful unless every applicable rule passes.

## 1. Frozen reference
- CryptoWorldz.xyz is the visual/reference baseline and must not be altered during this recovery unless the Owner explicitly requests a CryptoWorldz change.
- New Worldz pages must source approved imagery from the approved library/master bundle and render it using the same production-quality approach as CryptoWorldz.
- Placeholder artwork, generated substitutes, blurred assets, fallback illustrations, weak SVG stand-ins, and generic stock substitutions are forbidden when an approved image exists.

## 2. Required rollout scope
- OneWorldz.com
- SolWorldz.xyz
- PurpleDiamondCrew.com
- ImpactBased pages and links
- Idle/blockchain Worldz pages including ETH, Base, BNB, XRP, Sui, Hyper, Bitcoin and related approved Worldz targets
- RobinWorldz / RecoverYourDebt references
- OneWorldz ecosystem structure and relevant added Worldz pages such as LearnWorldz and BusinessWorldz where present in the approved build
- Command Centre references
- Zed, Auto and Grace references
- ReCap references
- Based.bid partnership references
- DexScreener / DEX / Trade Station links and controls where already approved for the site
- Humanitarian/donation pages using the approved real imagery and exact approved donation destinations

## 3. Purple Diamond Crew
- Use the real approved Purple Diamond Crew action imagery and real Hope Chest artwork.
- Glass-style Hope Chest buttons must work.
- Required pages must not collapse into one shell page.
- Donation buttons must use the exact approved fundraiser or approved organiser profile destination, never a generic GoFundMe landing page.
- Current approved fundraiser link: https://gofund.me/65129e58
- The ImpactBased button must resolve to a real working approved destination before production can pass.
- Humanitarian references must distinguish the real people/projects correctly and must not relabel unrelated orphanage imagery as Reagan's project.

## 4. SolWorldz
- SolWorld.fun is retired: do not deploy to it, link to it, or treat it as an active renewal target.
- SolWorldz.xyz is the active replacement.
- Approved desktop/mobile hero artwork and ecosystem imagery must be the exact approved assets, not only files with matching names.

## 5. Image integrity
For every approved production image:
- Source asset must exist before deployment.
- Source SHA-256 must be recorded.
- Deployed/live image SHA-256 must match the approved source where transport does not transform the file.
- Browser must report a non-zero natural size.
- Image must be visible when intended to be visible.
- Image must not be blurred by CSS filters.
- Image must not be materially upscaled beyond its source resolution.
- Desktop and mobile must both be checked.

A byte-size threshold alone is NOT proof of image correctness.
A filename appearing in HTML alone is NOT proof of image correctness.
HTTP 200 alone is NOT proof of image correctness.

## 6. Link integrity
Every production CTA/button must be tested by exact destination.
- Generic homepages are forbidden when an exact approved destination exists.
- Broken DNS, 404, parked pages, redirect loops and generic service landing pages are failures.
- Donation, ImpactBased, Based.bid, ReCap, Telegram, X, Command Centre, DEX and Trade Station links must be checked individually where present.

## 7. Browser proof
A release must render in a real browser at desktop and mobile sizes.
Capture screenshots of every deployed target and retain the audit artifact.
A site fails if it contains:
- broken/blank intended images
- blurred approved imagery
- hosting default/parked pages
- loading shells in place of the requested page
- missing requested secondary pages
- wrong project/person imagery
- visibly wrong branding

## 8. False-success ban
No workflow or assistant report may say DONE, SUCCESS, LIVE, VERIFIED or READY solely because:
- a command exited 0
- FTP upload completed
- a page returned HTTP 200
- an image exceeded a byte-size threshold
- a filename/string exists in HTML
- a summary step ran with `if: always()`

A deployment may be called successful only after the production acceptance gate passes.

## 9. Workflow behaviour
- Audit/check workflows must return non-zero when a required target fails.
- No `exit 0` may suppress a detected required-site failure.
- Rollback capture failure must not be silently ignored for production deploys.
- Production workflows must not use `ssl:verify-certificate no` unless a documented exception is explicitly approved.
- Unrelated Zed/Auto CI failures must not be described as website deployment failures; website deployment status must be reported separately.
- Legacy CryptoUniverse branding must not appear in production-facing Worldz content unless preserved in an explicitly labelled archive/history context.

## 10. Owner acceptance
The final human acceptance test is the live result opened by JayJayTeamDev.
If JayJayTeamDev opens the production site and a critical requested image, page, brand element or exact link is wrong, the rollout is FAILED regardless of GitHub's green status.

## Release rule
BUILD -> STATIC CHECKS -> HASH CHECKS -> BROWSER CHECKS -> LINK CHECKS -> BACKUP -> DEPLOY -> LIVE HASH/LINK/BROWSER CHECKS -> OWNER ACCEPTANCE

No skipped stage may be reported as success.