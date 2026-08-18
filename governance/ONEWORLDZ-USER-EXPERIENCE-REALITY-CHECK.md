# OneWorldz User Experience Reality Check

Status date: 2026-08-19 Australia/Sydney

Purpose: collect the actual user-facing vision, compare it with what exists in the repository, and prevent a technical deployment pass from being mistaken for a finished OneWorldz experience.

## Core rule

OneWorldz is not finished when the websites merely deploy. The finished experience must let a new person discover OneWorldz, join through a Legend referral, understand the mission visually, contact ZED, participate, create or complete Raaiiidd activity, submit evidence, receive human approval where required, earn recognition fairly, and see how their work connects to real-world impact.

## Reality matrix

| Requirement | Current reality | Status | Required reality |
|---|---|---|---|
| Unique MiniApp SplashBack | MiniApp opens on a generic purple star field with Z badge and loading orb. No dedicated new SplashBack experience is wired. | MISSING | Build a unique opening visual using approved Command Centre artwork and the five system leaders ZED, AUTO, G.R.A.C.E., RECAP and BASED.BID, with human leadership kept separate. |
| Command Centre visual identity | Dark purple galaxy/chrome/neon styling exists. | PARTIAL | Turn the MiniApp into a deliberate Command Centre composition, not merely a styled mobile dashboard. |
| OneWorldz GPT inside the participant journey | OneWorldz GPT exists on OneWorldz and DonateWorldz as a public information/router chat. | PARTIAL | Add authenticated participant mode so a Legend can ask ZED/OneWorldz GPT to open missions, profile, referrals, evidence and approved actions without leaving the guided experience. |
| Complete missions access | Telegram `/missions` and MiniApp Missions screen exist. | EXISTS | Make the same mission state reachable through the OneWorldz GPT guided surface and preserve direct `/missions` access. |
| Create a social post with ZED | Grace supports text post drafts for authorised operators. | PARTIAL | Give eligible participants a safe Raaiiidd Creator flow for copy drafting without granting publishing authority. |
| Create an image for a Raaiiidd | No participant image-generation pipeline is connected to ZED/MiniApp. | MISSING | Add approved image generation with brand/theme constraints, preview, regenerate and submit-for-review controls. Never auto-publish generated media. |
| Turn user-created post into Raaiiidd | Admins can create missions and members can submit mission completion. | PARTIAL | Add Draft → Preview → Submit to Raaiiidd Review → Admin Approve/Reject → Mission Published workflow. |
| Admin approval | `/pending`, `/approve`, `/reject` and MiniApp Admin review controls exist. | EXISTS | Preserve explicit human approval and add reviewer queues/digests. |
| Stepper hourly approval check | No Stepper-specific hourly approval digest/check is wired. | MISSING | Create a once-hourly review digest for the designated Stepper/Admin reviewer, with pending count and direct approve/reject/open buttons. No automatic approval. |
| Join through Shill Link | Unique Telegram invite links and join tracking exist. | EXISTS | Surface referral identity and onboarding progress immediately in MiniApp. |
| Referral points | Qualification and anti-abuse rules exist; points are not awarded on click/join alone. | EXISTS WITH DELAY | Show pending referral recognition immediately; convert to earned points only after registration, retention and other configured checks. |
| First-Raaiiidd Shill Boost | Additional newcomer boost after first verified Raaiiidd exists. | EXISTS | Surface progress visibly during onboarding. |
| Recognition for people already helping on the ground | Unique Legend recognition exists for sustained in-system activity. A people/stories list exists in planning data. | PARTIAL | Add a separate real-world Hero evidence path so existing field work can be submitted, verified and publicly recognised without pretending it happened inside the system. |
| Public Heroes destination | No dedicated Heroes page/directory is currently generated from the real people/stories plan. | MISSING | Add `oneworldz.com/heroes/` plus MiniApp Heroes/Impact entry and verified individual Hero story pages where consent/evidence permit. |
| Millions-ready participant experience | Current protected Node/Supabase MiniApp has authentication and rate limits, but no million-user load proof is recorded. | NOT PROVEN | Add performance budgets, queue architecture for media/AI work, caching/CDN strategy, rate-limit tiers, abuse controls, observability and staged load tests. |

## Desired participant journey

1. Person receives a Legend Shill Link.
2. Person joins the official community.
3. MiniApp recognises the referral and displays pending referral progress.
4. Person opens the unique OneWorldz/CryptoWorldz SplashBack.
5. ZED introduces the Command Centre and offers simple choices: Help Now, Missions, Create, On the Ground, Heroes, Learn, Profile.
6. Registration/profile is completed with minimal friction.
7. The OneWorldz GPT/ZED mini screen can read the authenticated Legend context and open the same mission/referral/profile data as direct commands.
8. Person can complete an existing Raaiiidd or choose Create a Raaiiidd.
9. Create a Raaiiidd can draft copy and an approved-theme image, but cannot publish directly.
10. Draft enters Admin Review.
11. Designated reviewers receive an hourly pending-review digest; Stepper can be the primary designated reviewer.
12. Approved draft becomes an active Raaiiidd and can be shared.
13. Verified mission completion receives Legend Points under the configured reward rules.
14. Referral qualification and first-Raaiiidd boost progress are visible throughout.
15. People already doing genuine field work can choose Already Helping? and submit evidence for Hero review.
16. Approved Hero recognition appears on a dedicated OneWorldz Heroes destination and the member profile where appropriate.

## Hero architecture

Keep these concepts separate:

- System leaders: ZED, AUTO, G.R.A.C.E., RECAP, BASED.BID.
- Human leadership: owner/executives/admins including the designated Stepper reviewer role.
- Legend recognition: points, ranks, referrals, verified Raaiiidds, Unique Legend.
- Real-world Heroes: people and organisations with verified evidence of practical action, including people who were helping before joining OneWorldz.
- Story subjects and partners: must never be represented as endorsed partners without evidence/permission.

The existing planning list includes Reagan / Action Spreads Smiles, Just Knate, Sam Weidenhofer, Dylan Thiry, Victor — The Good Boss, and MDMotivator, but a planning list is not a public Hero system. Publication requires accurate context and appropriate evidence/consent.

## Theme reality

### Locked / materially represented

- OneWorldz: blue and white, human-first global gateway.
- CryptoWorldz: deep blue-purple / electric blue-purple with silver-white/chrome, visibly separate from Purple Diamond Crew.
- Purple Diamond Crew: deep purple / Purple Diamond identity with Hope Chest / real-world action character.
- SolWorldz: Solana-specific approved artwork and cyan/purple accent pair.
- EthWorldz: Ethereum-specific approved artwork and blue/periwinkle accent pair.
- BaseWorldz: Base-specific approved artwork and Base blue accent pair.
- BNBWorldz: BNB-specific approved artwork and gold accent pair.
- XRPWorldz: XRPL-specific approved artwork and cyan/white accent pair.
- SuiWorldz: Sui-specific approved artwork and Sui blue accent pair.
- HyperWorldz: Hyperliquid-specific approved artwork and mint/teal accent pair.
- RobinWorldz: Robin Hood Chain-specific approved artwork and green/gold accent pair, separate from legal-advice identity.
- HodlerWorldz: gold/purple accent pair exists, but its own stronger motif is not yet locked.

### Motif exists but distinct full visual theme is not yet sufficiently locked/enforced

- ImpactBased: approved ImpactBased/Based.bid impact artwork and purpose-led board identity.
- Law.OneWorldz: justice/civic-rights and scales motif.
- Learn.OneWorldz: education/empowerment and book motif.
- FoodWorldz: feeding communities, food/heart motif.
- DonateWorldz: support/donation, heart/donation motif.
- HodlerGalaxy: ecosystem/exploration concept, but no sufficiently distinct locked palette/motif was found.

### MiniApp / Command Centre

Current styling uses purple galaxy, chrome/neon and dark panels. This is compatible with the broader CryptoWorldz visual system but does not yet satisfy the intended unique SplashBack or full five-system-leader Command Centre composition.

## Non-negotiable safety/quality boundaries

- Generated user content never auto-publishes.
- Admin approval remains explicit for user-created Raaiiidd content.
- Shill/referral anti-abuse checks remain intact.
- Points are not purchased by donations or token holdings.
- Existing real-world work may be recognised only with reviewable evidence; do not fabricate dates, impact, endorsements or partnerships.
- Private keys, seed phrases, bank credentials and API secrets never enter public chat or browser code.
- All new public routes remain canonical, crawlable, sitemap-listed and inside the Lighthouse/desktop/mobile verification system.
- A technical deployment pass is not a finished user-experience pass.

## Build collection — next implementation set

1. Unique MiniApp SplashBack and full Command Centre visual composition.
2. Authenticated ZED / OneWorldz GPT participant bridge.
3. Participant Raaiiidd Creator: text + image + preview + submit for review.
4. Stepper/Admin hourly review digest.
5. Immediate referral onboarding/progress surface with qualified-points safeguards preserved.
6. Real-world Hero evidence intake and review workflow.
7. Public Heroes directory and verified Hero story pages.
8. Theme contract expansion for every non-chain destination lacking a distinct enforced theme.
9. Million-user readiness proof plan and staged load testing.
10. End-to-end user proof: Shill Link → Join → Register → Mission/Create → Admin Review → Points/Recognition → Hero/Impact visibility.
