# Active Files — Canonical Keep / Retire Record

Status: CLEANUP EXECUTED CONTROL MAP
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
- `apps/oneworldz-ecosystem-release/production-targets.mjs` is the only static destination contract.
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

The request file is a state record only. There is no static production-write workflow during cleanup/security lockdown.

## RETIRED — REMOVED FROM ACTIVE TREE

The following competing website/gateway roots are retired:
- `apps/cryptoworldz-web-core/`
- `apps/oneworldz-hub-central/`
- `apps/worldz-sites/`
- `src/pdc-host.js` public Worldz host-routing gateway
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

Until a new production rail passes the JayJayTeamDev × ChatGPT gate:

1. Build only from `apps/oneworldz-ecosystem-release/`.
2. Verify with `npm run verify:web`.
3. Produce candidate desktop/mobile browser proof.
4. Do not write to Hostinger production.
5. Prove the exact authenticated Hostinger remote-root mapping once.
6. Only then may one canonical production workflow be designed and reviewed.
7. No per-domain deployment workflow, emergency direct route or alternative gateway may be added alongside it.

## HOSTING LAW

The source tree does not guess `public_html`, `/`, domain folders or subdomain roots. Hosting destinations are facts to be authenticated and recorded in the one target contract. If remote structure conflicts with the contract, deployment stops; it does not try another path.

## BRANCHES / HISTORY

Git history remains evidence. Old branches are not production authorities and must never be selected by planning/build/deployment logic. The active source of truth is `main` plus the governance and canonical build paths above. Branch-reference deletion is a separate repository-maintenance operation and does not create another build route.

## FAIL-CLOSED STRUCTURE RULE

Root `package.json` runs a structural guard. If a retired gateway/source path or legacy static deployment workflow reappears, canonical verification fails instead of silently choosing between routes.
