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

The request file is a state record only. It is not a workflow trigger.

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
3. Produce candidate desktop/mobile browser proof.
4. Authenticate and record the exact Hostinger account/site/root for every target.
5. Use exactly one Hostinger static-fleet production rail.
6. Verify live technical behaviour.
7. Produce fresh live desktop/mobile proof.
8. Record final JayJayTeamDev × ChatGPT status.

No per-domain deployment workflow, emergency direct route, alternate gateway or second production mechanism may be added alongside the canonical rail.

## HOSTING LAW

The source tree does not guess a physical Hostinger path.

Hostinger may show a website home directory such as `/home/<account>/domains/<domain>/public_html` or `/home/<account>/public_html`. That physical path must be captured only as authenticated evidence.

The deployment contract uses remote `/` only when the selected FTP/SFTP credential is already scoped to that exact website root. Therefore:

- never prepend `public_html` to a credential that already lands inside the website root;
- never guess `domains/<domain>/public_html` from another account's layout;
- never try sibling directories after a failed authentication/path check;
- correct the target contract before production if Hostinger evidence disagrees.

DNS, mail, registrar records and the protected CryptoBotz Node application are outside the static deployment rail.

## GITHUB ENVIRONMENTS / BRANCHES / HISTORY

Historical GitHub Environments and old branches are non-authoritative metadata. Their existence must not influence planning, target selection or deployment routing.

Current source of truth is `main` plus the governance and canonical build paths above. A stale environment such as an old test or retired-domain environment cannot become active merely because its name matches an old workflow.

Git history remains evidence. Old branches are not production authorities and must never be selected by planning/build/deployment logic.

## FAIL-CLOSED STRUCTURE RULE

Root `package.json` runs a structural guard. If a retired gateway/source path or legacy static deployment workflow reappears, canonical verification fails instead of silently choosing between routes.
