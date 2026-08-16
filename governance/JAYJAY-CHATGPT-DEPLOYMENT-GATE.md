# JayJayTeamDev × ChatGPT Deployment Gate

Status: LOCKED PRODUCTION RULE
Owner: JayJayTeamDev
Applies to: every OneWorldz ecosystem production update from this point forward.

## Core rule

No build, commit, test result, HTTP 200 response, title check, workflow success or deployment upload may be described as a **100% PASS** by itself.

A release receives **100% PASS** only when every gate below is complete for the exact same release candidate.

## One canonical release pipeline

1. **BUILD PASS**
   - Build the exact approved plan.
   - Run tests, secret checks, protected-service boundaries and destination-contract checks.
   - No production write occurs here.

2. **PREVIEW VISUAL PASS — ChatGPT**
   - Render the candidate in real browser viewports.
   - Capture desktop and mobile proof for every changed destination.
   - Check required artwork, identity, crop, proportions, text readability, menu behaviour, buttons/links, broken images, console errors, horizontal overflow, spacing and mobile fitment.
   - ChatGPT must explicitly record `CHATGPT_VISUAL_PASS` for the exact candidate. A technical test cannot substitute for this gate.

3. **DEPLOYMENT APPROVAL — JayJayTeamDev**
   - JayJayTeamDev sees the approved candidate/proof and gives one deployment-stage approval for that exact candidate.
   - Build and planning work before this point does not require repeated deployment permission.
   - Any content change after approval invalidates the approval and returns the release to BUILD PASS.

4. **PRODUCTION DEPLOY**
   - Back up only the exact package-owned production files.
   - Deploy only to the authenticated exact destination.
   - Never guess a hosting root or alter protected services, DNS, mail or unrelated files.
   - Failure at any transfer/proof step blocks completion and triggers safe rollback where a valid backup exists.

5. **LIVE TECHNICAL PASS**
   - Verify the live release identity, required pages/assets, links, HTTP behaviour and protected-service boundaries.
   - A title-only check is insufficient.

6. **LIVE VISUAL PASS — JayJayTeamDev × ChatGPT**
   - Capture fresh production desktop and mobile browser proof after deployment with cache bypass.
   - Verify the live rendering matches the approved candidate and has no broken/missing imagery, distortion, overlap, unreadable content, mobile overflow or obvious layout regression.
   - JayJayTeamDev and ChatGPT are the final visual approval pair.

7. **FINAL STATUS**
   - Only after gates 1–6 pass may the release state be written or reported as:
     `JAYJAYTEAMDEV × CHATGPT — 100% PRODUCTION PASS`

## Mandatory status language

Use only these release states:

- `BUILD PASS`
- `PREVIEW VISUAL PASS`
- `AWAITING JAYJAYTEAMDEV DEPLOYMENT APPROVAL`
- `DEPLOYING`
- `LIVE TECHNICAL PASS`
- `LIVE VISUAL PASS`
- `JAYJAYTEAMDEV × CHATGPT — 100% PRODUCTION PASS`
- `FAIL — NOT APPROVED`

If any gate is missing, failed, cancelled, skipped or unverified, the release is **not** 100% passed.

## Visual evidence requirement

Every changed public site must produce at minimum:

- desktop browser proof at a standard wide viewport;
- mobile browser proof at a standard phone viewport;
- broken-image result;
- horizontal-overflow result;
- browser console/page-error result;
- required identity/artwork check;
- menu and primary action-link check.

Visual proof must be tied to the exact candidate commit/build digest. Old screenshots never approve a newer build.

## Deployment safety rule

Production Actions remain disabled during TOTAL Outside Access Lockdown™ until the canonical deployment workflow itself is repaired and reviewed. Obsolete production workflows are not to be re-enabled as alternate deployment paths.

## Current OneWorldz correction

The August 2026 OneWorldz master candidate must not be labelled 100% deployed merely because its build verification passed. Its production deployment and live visual proof are separate gates and must be completed successfully under this policy.
