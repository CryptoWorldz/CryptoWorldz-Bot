# Active Files — Canonical Keep / Retire Record

Status: TOTAL CLEANUP EXECUTED / TOTAL DEPLOYMENT PLAN ACTIVE
Owner: JayJayTeamDev
Purpose: one build authority, one active static source tree, one image-file boundary and no competing website gateways or parallel static deployment routes.

## ACTIVE — KEEP

### Protected CryptoBotz runtime
- `index.js`
- `auto-server.js`
- `src/` except retired public-domain gateway code
- required `public/` Mini App / Hub Central assets
- required `supabase/` integration and migrations
- runtime tests that protect ZED, AUTO, G.R.A.C.E., Command Centre and owner/admin boundaries

### One canonical static ecosystem build
- `apps/oneworldz-ecosystem-release/` is the only child of `apps/`.
- `apps/oneworldz-ecosystem-release/production-targets.mjs` is the only static destination + authenticated Hostinger transport contract.
- `apps/oneworldz-ecosystem-release/source/` is the only active static-site source area.
- Generated `dist/` is build output, never a second source tree.
- No separate static helper `scripts/` directory is retained.

### One active static image-file boundary
All deployable static-site image files must live under:

`apps/oneworldz-ecosystem-release/source/assets/`

`source/approved-visuals/` contains only encoded source fragments required to materialize three already-approved AVIF masters during build. It is not a reference library and contains no deployable image files.

No root media folder, archive image bundle, restoration library or alternate static image source is permitted.

### Governance
- `governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md`
- `governance/FLEET-REQUIREMENTS.md`
- `governance/JAYJAY-CHATGPT-DEPLOYMENT-GATE.md`
- `governance/master-use-library-manifest.v1.json`
- `governance/community-support-links.json`
- this file

### Deployment state
Exactly two files are permitted in `deployments/`:
- `deployments/README.md`
- `deployments/oneworldz-19-total.request`

The request file is a state record only. It must never multiply into domain-specific request files.

### Tools
Exactly two files are permitted in `tools/`:
- `tools/verify-oneworldz-canonical.mjs`
- `tools/resolve-community-facebook-metadata.mjs`

No direct FTP helper, root guesser or emergency deploy helper is permitted in `tools/`.

### GitHub execution boundary
- `.github/workflows/main.yml` is the only file permitted to contain static-fleet Hostinger deployment execution.
- `.github/workflows/command-centre-v4.yml` remains protected-runtime verification only.
- `.github/workflows/resolve-community-facebook-profiles.yml` remains metadata/support only.

No fourth workflow is permitted by the structural guard. The two non-main workflows are also scanned so static FTP/Hostinger deployment authority cannot leak into them.

## RETIRED — REMOVED FROM ACTIVE TREE

The following competing website/gateway roots are retired and structurally forbidden:
- `apps/cryptoworldz-web-core/`
- `apps/oneworldz-hub-central/`
- `apps/worldz-sites/`
- retired public Worldz host-routing logic from `src/pdc-host.js`
- `master-use-library/` legacy architecture location
- `media/` active/restoration image route
- `diagnostics/` one-off request-trigger directory
- `docs/` legacy authority area
- `.github/certifications/`
- `archive/`

The following categories are retired:
- domain-specific and `*-only` static deployment workflows;
- parallel OneWorldz/CryptoWorldz/SolWorldz FTP deployment workflows;
- repair, rollback, preflight and alternate-root workflows from previous deployment attempts;
- one-off deployment/audit request trigger files;
- legacy direct FTP helpers and root-discovery helpers;
- standalone SolWorldz/Purple Diamond Crew static builders superseded by the canonical fleet build;
- scripts that restore/copy old approved-image ZIPs into another app tree;
- duplicate browser audit generations superseded by the canonical browser proof harness;
- stale one-off visual-integration scripts superseded by the current canonical build.

Historical material remains recoverable through Git history. It is not kept as another live folder on `main`.

## STATIC DEPLOYMENT LAW

The current total-deployment instruction authorises the unchanged canonical release to progress without repeated approval prompts. The only allowed sequence is:

1. Clean only from the current `main` source map.
2. Build only from `apps/oneworldz-ecosystem-release/`.
3. Verify with the root structural/runtime checks and canonical web tests.
4. Produce candidate desktop/mobile browser proof and bind it to the exact canonical static-source tree SHA.
5. Re-authenticate the exact stored Hostinger transport directories before write.
6. Use exactly one Hostinger static-fleet production rail: `.github/workflows/main.yml`.
7. Verify live technical behaviour.
8. Produce fresh live desktop/mobile proof.
9. Record final JayJayTeamDev × ChatGPT status.

No per-domain deployment workflow, emergency direct route, alternate gateway or second production mechanism may be added alongside the canonical rail.

## HOSTING LAW

There are two different roots and they must never be confused again:

- **Website/package root:** `/` with homepage `/index.html` and assets `/assets/`.
- **Hostinger transport directory:** the physical folder reached by the existing shared Hostinger FTP account.

Transport directories are stored once as `hostingerTransportDir` values in `production-targets.mjs`. Deployment code must read the exact value. It may not generate a path from the domain name, append `public_html`, probe a sibling folder, fall back to `/`, or choose another historical environment when a path fails.

A transport mismatch is a hard failure and the release stops.

DNS, mail, registrar records and the protected CryptoBotz Node application are outside the static deployment rail.

## GITHUB ENVIRONMENTS / BRANCHES / HISTORY

Historical GitHub Environments and old branches are non-authoritative metadata. Their existence must not influence planning, target selection or deployment routing.

The sole exception is the already proven `cryptoworldz-production` environment when `.github/workflows/main.yml` uses its existing shared Hostinger FTP credential set for the one canonical rail. It is the credential boundary, not another deployment option.

Current source of truth is `main` plus the governance and canonical build paths above. Git history remains evidence. Old branches are not production authorities and must never be selected by planning/build/deployment logic.

## FAIL-CLOSED STRUCTURE RULE

Root `package.json` runs a structural guard. Verification fails if a retired gateway/source path, `archive/`, extra app, extra deployment state file, extra tool, fourth workflow, static Hostinger deployment code outside `main.yml`, or static image file outside the canonical assets boundary returns.
