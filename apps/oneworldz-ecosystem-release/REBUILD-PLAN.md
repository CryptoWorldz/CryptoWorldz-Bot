# OneWorldz Clean Production Rebuild Plan

Status: PLAN ONLY — NO PRODUCTION DEPLOY

## Findings that control this rebuild

1. Chat history requires the OneWorldz/CryptoWorldz ecosystem, 18 static Hostinger targets, protected ZED/Command Centre runtime, exact desktop/mobile artwork, donation separation, World DEX/markets, Sponsor/Apply, human-impact routes, acknowledgements, and the ZED/AUTO/G.R.A.C.E./RECAP/BASED.BID roles.
2. The last proven 18-target Hostinger static deployment transported an 89-page candidate successfully, but that candidate ran pool/cursor image filling and route-guessing hero replacement. Transport success therefore did not prove visual correctness.
3. GitHub contains the real application/runtime and website systems, but its history also contains many obsolete deployment locks, watchers, proof rails, fallback image passes and repeated repair attempts. Those deployment mechanisms are not requirements.
4. Supabase is an existing production data/control plane and is not to be rebuilt by the website release. AUTO/Ultimate execution controls and GRACE approval controls remain independent application safety boundaries.

## Build boundary

The clean rebuild changes only the static website source/build/release layer unless a ZED source file is explicitly changed.

Do not rebuild, reset, seed, migrate, delete or replace Supabase data as part of this website rebuild.
Do not modify protected ZED runtime code merely to satisfy a website release.
Do not generate new artwork. Use approved repository assets only.

## Image authority

Create exactly one new image manifest. It is the only code allowed to assign production image identity.

Every required visual slot must resolve explicitly as:

SITE -> ROUTE -> SLOT -> DESKTOP ASSET -> MOBILE ASSET -> SHAPE -> FIT -> POSITION

Rules:
- no pools
- no cursor cycling
- no random selection
- no fallback person/girl image
- no route-keyword guessing
- no implicit hero replacement
- no banner in a square identity slot
- no square profile image stretched into a wide banner
- no unmapped required visual slot; unmapped required slots fail the build
- layout/CSS passes may size or style a resolved slot but may not change its asset

## Website build

Preserve existing approved content/features that are confirmed by Chat history, current source and Supabase integration.

Build all current static targets from `apps/oneworldz-ecosystem-release/`.
Generate the complete route fleet and sitemap.
Apply the exact image manifest after all content-generating passes and before final manifest hashing.
Apply layout-only responsive/mobile CSS after image identity is final; responsive code must not change image identity.
Validate every generated HTML page, not representative pages only.

Validation must prove:
- expected target count
- expected generated page count derived from the build, not a stale hard-coded historical number
- every required route exists
- every required visual slot is mapped
- every referenced image exists
- slot shape contract is valid
- desktop/mobile source pair is explicit where required
- no deleted legacy image class/pass survives
- no forbidden pool/random/fallback logic is part of the production build chain
- donation destinations remain separated
- ZED links point to the protected runtime rather than copying runtime into static sites

## One production run, two isolated jobs

Replace automatic push deployment with one manually dispatched production release workflow.

The workflow contains two independent selectable jobs:

### WEBSITES
- input: deploy_websites
- builds only the static ecosystem
- uploads only the 18 allowlisted static Hostinger destinations from `production-targets.mjs`
- never writes `/domains/cryptobotz.cryptoworldz.xyz/nodejs`
- never restarts the Node application
- never uses BOT_TOKEN, OPENAI_API_KEY or Supabase service credentials

### ZED
- input: deploy_zed
- deploys only the protected Node runtime to `/domains/cryptobotz.cryptoworldz.xyz/nodejs`
- may use the existing protected runtime secrets required by ZED
- never writes any of the 18 static website roots
- never rebuilds the static ecosystem

The two jobs do not gate, roll back, cancel or overwrite each other.
No commit/push automatically deploys production.
A single manual run may select websites, ZED, or both.

## Destination contract

Static website destinations remain exactly the allowlisted Hostinger directories in `production-targets.mjs`.
Protected ZED destination remains `/domains/cryptobotz.cryptoworldz.xyz/nodejs`.
No historical fallback directory may be used.

## Implementation order

1. Freeze requirements from this plan.
2. Remove remaining production references to obsolete image/deployment rails.
3. Create the exact image manifest and resolver.
4. Wire the resolver into the final static build chain.
5. Add fail-closed image/route validation.
6. Replace push-triggered deploy workflows with one manual production release workflow containing isolated WEBSITES and ZED jobs.
7. Re-read the resulting workflow destination paths and secret scopes.
8. Re-read the final build chain to prove no legacy image authority remains.
9. Do not move this branch to `main` and do not run production until the completed candidate has been reviewed.
