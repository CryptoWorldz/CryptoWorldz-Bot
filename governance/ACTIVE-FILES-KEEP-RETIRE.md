# Active Files — Canonical Keep / Retire Record

Status: CLEANUP EXECUTED / TOTAL DEPLOYMENT PLAN ACTIVE
Owner: JayJayTeamDev
Purpose: one build authority, one active static source tree, no competing website gateways and no parallel static deployment routes.

## ACTIVE — KEEP

### Protected CryptoBotz runtime
- `index.js`
- `auto-server.js`
- `src/` except retired public-domain gateway code
- required `public/` Mini App / Hub Central assets
- required `supabase/` integration and migrations
- runtime tests that protect ZED, AUTO, G.R.A.C.E., Command Centre and owner/admin boundaries

### One canonical static ecosystem build
- `apps/oneworldz-ecosystem-release/`
- `apps/oneworldz-ecosystem-release/production-targets.mjs` is the only static destination + authenticated Hostinger transport contract.
- `apps/oneworldz-ecosystem-release/source/` is the only active static-site source area.
- Generated `dist/` is build output, never a second source tree.

### One active visual source boundary
All production website artwork used by the static fleet must enter through `apps/oneworldz-ecosystem-release/source/` and its manifest/build rules. No other app or root folder may act as a second production image library.

A sealed historical approved-image bundle is retained only under `archive/reference-media/` for provenance/recovery. It is not imported, restored, copied or searched by the active build.

### Governance
- `governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md`
- `governance/FLEET-REQUIREMENTS.md`
- `governance/JAYJAY-CHATGPT-DEPLOYMENT-GATE.md`
- `governance/master-use-library-manifest.v1.json`
- `governance/community-support-links.json`
- this file

### Deployment state
- `deployments/README.md`
- `deployments/oneworldz-19-total.request`

The request file is a state record only. It must never multiply into domain-specific request files.

### GitHub execution boundary
- `.github/workflows/main.yml` is the only file permitted to contain static-fleet Hostinger deployment execution if GitHub Actions is used.
- `.github/workflows/command-centre-v4.yml` remains verification only.
- `.github/workflows/resolve-community-facebook-profiles.yml` remains metadata/support only.

No fourth workflow is permitted by the structural guard.

## RETIRED — REMOVED FROM ACTIVE TREE

The following competing website/gateway roots are retired:
- `apps/cryptoworldz-web-core/`
- `apps/oneworldz-hub-central/`
- `apps/worldz-sites/`
- retired public Worldz host-routing logic from `src/pdc-host.js`
- `master-use-library/` legacy architecture location
- `media/` active/restoration image route
- `diagnostics/` one-off request-trigger directory

The following categories are retired:
- domain-specific and `*-only` static deployment workflows;
- parallel OneWorldz/CryptoWorldz/SolWorldz FTP deployment workflows;
- repair, rollback, preflight and alternate-root workflows from previous deployment attempts;
- one-off deployment/audit request trigger files;
- legacy direct FTP helpers and root-discovery helpers;
- standalone SolWorldz/Purple Diamond Crew static builders superseded by the canonical fleet build;
- scripts that restore/copy the old approved-image ZIP into a legacy app tree;
- duplicate browser audit generations superseded by the canonical browser proof harness.

## STATIC DEPLOYMENT LAW

The current total-deployment instruction authorises the unchanged canonical release to progress without repeated approval prompts. The only allowed sequence is:

1. Build only from `apps/oneworldz-ecosystem-release/`.
2. Verify with `npm run verify:web` and the root structural/runtime checks.
3. Produce candidate desktop/mobile browser proof and bind it to the exact canonical static-source tree SHA.
4. Use the already authenticated 18-destination Hostinger proof and re-authenticate the exact recorded transport directories before write.
5. Use exactly one Hostinger static-fleet production rail.
6. Verify live technical behaviour.
7. Produce fresh live desktop/mobile proof.
8. Record final JayJayTeamDev × ChatGPT status.

No per-domain deployment workflow, emergency direct route, alternate gateway or second production mechanism may be added alongside the canonical rail.

## HOSTING LAW

There are two different roots and they must never be confused again:

- **Website/package root:** `/` with homepage `/index.html` and assets `/assets/`.
- **Hostinger transport directory:** the physical folder reached by the existing shared Hostinger FTP account.

All 18 transport directories were authenticated by the successful read-only proof recorded as run `31925927520`, job `95113450775`, against the unchanged current topology tree SHA `5e4bffb4a40a6968d432ca73e619feb15705859c`.

Those exact transport directories are now stored once as `hostingerTransportDir` in `production-targets.mjs`. Deployment code must read the exact value. It may not generate a path from the domain name, append `public_html`, probe a sibling folder, fall back to `/`, or choose another historical environment when a path fails.

A transport mismatch is a hard failure and the release stops.

DNS, mail, registrar records and the protected CryptoBotz Node application are outside the static deployment rail.

## GITHUB ENVIRONMENTS / BRANCHES / HISTORY

Historical GitHub Environments and old branches are non-authoritative metadata. Their existence must not influence planning, target selection or deployment routing.

The sole exception is the already proven `cryptoworldz-production` environment when `.github/workflows/main.yml` uses its existing shared Hostinger FTP credential set for the one canonical rail. It is not one option among many; it is the credential boundary that produced the authenticated 18-root proof.

Current source of truth is `main` plus the governance and canonical build paths above. Git history remains evidence. Old branches are not production authorities and must never be selected by planning/build/deployment logic.

## FAIL-CLOSED STRUCTURE RULE

Root `package.json` runs a structural guard. If a retired gateway/source path, a fourth workflow, a competing deployment state file or a stale deployment-gate marker reappears, canonical verification fails instead of silently choosing between routes.
