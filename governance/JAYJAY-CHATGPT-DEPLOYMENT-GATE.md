# JayJayTeamDev × ChatGPT — Single-Rail Total Deployment Gate

Status: LOCKED PRODUCTION RULE
Owner: JayJayTeamDev
Operator pair: JayJayTeamDev × ChatGPT
Applies to: the current canonical OneWorldz static fleet and every later production update unless JayJayTeamDev explicitly replaces this rule.

## Authority and non-authority

The latest direct JayJayTeamDev instruction is the release authority. The current instruction `Perform TOTAL DEPLOYMENT PLAN` authorises the current canonical release to proceed through planning, build, verification, Hostinger destination proof, production deployment and live verification without another repeated deployment-approval prompt, provided the approved plan and destination set do not change.

These are never production authority: archive material, old branches, old GitHub Environments, old deployment request files, retired workflows, historical screenshots, previous assistant claims or a successful HTTP response by itself.

A new owner review is required only if one of these changes after the current authority is recorded:

- public content or imagery outside the locked plan;
- target domain or destination mapping;
- payment destination;
- DNS, mail or registrar configuration;
- protected CryptoBotz, ZED, AUTO, G.R.A.C.E., Supabase or owner/admin security boundaries;
- a secret, wallet signing capability or financial-control permission.

If none of those changes, do not ask JayJayTeamDev to re-approve the same release stage again.

## One canonical source

Static source/build authority: `apps/oneworldz-ecosystem-release/` only.

Production artwork used by the static fleet must enter through that canonical app source and its manifest/build rules. `archive/` is evidence/reference only and must never be auto-imported, searched as a fallback image source or treated as a second build source.

`cryptobotz.cryptoworldz.xyz` is a separate protected Node application and is never a static deployment target.

## Single deterministic deployment pipeline

The exact same static candidate must pass these gates in order:

1. **CLEAN SOURCE LOCK**
   - Retired gateways, duplicate builders, alternate deployment helpers and parallel production routes remain outside the active tree.
   - The structural guard must pass.

2. **BUILD PASS**
   - Build the exact locked plan from the canonical app.
   - Run tests, secret checks, protected-service boundaries and target-contract checks.
   - No production write occurs here.

3. **PREVIEW VISUAL PASS — ChatGPT**
   - Render the exact candidate in real desktop and mobile browser viewports.
   - Check required artwork, identity, crop, proportions, text readability, menu behaviour, buttons/links, broken images, browser/page errors, spacing and horizontal overflow.
   - Record the proof against the exact canonical static-source tree digest.

4. **HOSTINGER DESTINATION PASS**
   - Use only the existing shared Hostinger account and the exact 18 transport directories already authenticated by the recorded read-only Hostinger proof.
   - The 18 exact transport destinations are stored once in `apps/oneworldz-ecosystem-release/production-targets.mjs` as `hostingerTransportDir` values.
   - Website/package root remains `/`; homepage remains `/index.html`; website assets remain `/assets/`.
   - `hostingerTransportDir` is transport evidence for the shared Hostinger account only. It must never be derived, guessed, concatenated, probed or substituted at deployment time.
   - A destination mismatch is `FAIL — NOT APPROVED`; do not try another directory, account, gateway or workflow.

5. **PRODUCTION DEPLOY**
   - Use exactly one authenticated Hostinger static-fleet rail and the exact verified `hostingerTransportDir` for each target.
   - Back up only the package-owned production files for the exact target.
   - Upload non-homepage files first and switch `/index.html` last where the transfer mechanism allows it.
   - Preserve DNS, mail, registrar records, unrelated files and protected services.
   - No domain-specific emergency rail, fallback gateway or second deployment workflow may be introduced.

6. **LIVE TECHNICAL PASS**
   - Verify release identity, required pages/assets, links, HTTP behaviour and protected-service boundaries on the live destination.
   - A title-only or HTTP-200-only check is insufficient.

7. **LIVE VISUAL PASS — JayJayTeamDev × ChatGPT**
   - Capture fresh cache-bypassed desktop and mobile production proof.
   - Verify live rendering matches the approved candidate with no missing imagery, distortion, overlap, unreadable content, mobile overflow or obvious regression.

8. **FINAL STATUS**
   - Only after gates 1–7 pass may the release be recorded as:
     `JAYJAYTEAMDEV × CHATGPT — 100% PRODUCTION PASS`

## GitHub execution law

Only `.github/workflows/main.yml` may be used as the static-fleet execution rail if GitHub Actions is used for this release. It is not permission to create a fourth workflow.

The other retained workflows are verification/support workflows only and must never receive static Hostinger deployment authority.

Existing GitHub Environments from historical deployment attempts are inert metadata except the already proven `cryptoworldz-production` environment if `.github/workflows/main.yml` uses its existing Hostinger FTP credentials for the single rail. No other historical environment may be selected merely because it exists.

No retired static deployment workflow may be restored. No domain-specific workflow may be added. Any future replacement execution mechanism must replace the single rail rather than coexist with it.

## Exact candidate law

A preview pass approves a canonical static-source tree, not an arbitrary later commit. Before production write, `.github/workflows/main.yml` must prove that the current `apps/oneworldz-ecosystem-release/` Git tree SHA matches the tree SHA recorded by the ChatGPT preview pass.

A state-only deployment-control commit may follow preview approval. Any change inside the canonical static app invalidates the preview and returns the release to `BUILD PASS`.

## Mandatory release states

Use only these operational states:

- `CLEAN SOURCE LOCK`
- `BUILD PASS`
- `PREVIEW VISUAL PASS`
- `HOSTINGER DESTINATION PASS`
- `DEPLOYING`
- `LIVE TECHNICAL PASS`
- `LIVE VISUAL PASS`
- `OWNER REVIEW REQUIRED`
- `JAYJAYTEAMDEV × CHATGPT — 100% PRODUCTION PASS`
- `FAIL — NOT APPROVED`

A Hostinger destination mismatch is never permission to guess another route.

## Visual evidence requirement

Every changed public site must produce at minimum:

- desktop browser proof at a standard wide viewport;
- mobile browser proof at a standard phone viewport;
- broken-image result;
- horizontal-overflow result;
- browser console/page-error result;
- required identity/artwork check;
- menu and primary action-link check.

Old screenshots never approve a newer static-source tree.

## No-repeat approval rule for the current total deployment

JayJayTeamDev's explicit `Perform TOTAL DEPLOYMENT PLAN` instruction is the standing owner deployment authority for the current canonical candidate chain. ChatGPT may continue through the stages above without stopping for another approval phrase while the candidate remains inside the locked plan and every authenticated safety boundary is preserved.
