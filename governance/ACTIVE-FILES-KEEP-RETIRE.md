# Active Files — KEEP / RETIRE / QUARANTINE

Purpose: stop the repository becoming a second uncontrolled library.

## KEEP — build authority / protected runtime

- `governance/ONEWORLDZ-CANONICAL-BUILD-AUTHORITY.md`
- `governance/FLEET-REQUIREMENTS.md`
- `tools/verify-oneworldz-canonical.mjs`
- current protected CryptoBotz Node runtime (`index.js`, `src/`, required `public/`, current Supabase integration)
- current active static-fleet release source/build only after it passes the canonical gate
- approved/restored Worldz image-reference package and its integrity checksum
- current working Spaceship DNS control for FoodWorldz while it remains needed
- current total-fleet production target/topology definitions until safely replaced
- source/history required to prove genuine Purple Diamond Crew legacy data and protected roles

## RETIRED / DELETED ALREADY

Temporary repair machinery created during the failed OneWorldz visual-repair cycle has been removed:

- `.github/workflows/deploy-oneworldz-visual-repair.yml`
- `.github/workflows/deploy-oneworldz-via-hostinger-api.yml`
- `.github/workflows/deploy-oneworldz-hostinger-cron-v2.yml`
- `deployments/oneworldz-visual-repair.request`
- `deployments/oneworldz-hostinger-api-repair.request`
- `deployments/oneworldz-hostinger-cron-v2.request`
- `ops/oneworldz/remote-visual-repair.sh`
- obsolete Hostinger-side FoodWorldz DNS repair workflow/request (FoodWorldz registrar control is via Spaceship)

These must not be recreated as parallel deployment authorities.

## RETIRE FROM ACTIVE PRODUCTION SOURCE

The following are superseded by the current support plan and must not appear in a production manifest/build:

- active GoFundMe navigation/routes/configuration;
- old GoFundMe campaign cover wiring;
- generic `Facebook Support Profile 01...35` labels as public labels;
- `NEXT PASS` / internal deployment-state copy;
- text-only Worldz destination cards without unique profile imagery;
- duplicate OneWorldz home implementations that compete with the canonical gateway;
- ad-hoc visual repair CSS/JS once the clean canonical OneWorldz source replaces it.

Historical evidence may be retained only outside production manifests where it is clearly labelled archive/reference.

## QUARANTINE / DEPENDENCY REVIEW BEFORE DELETE

Do not mass-delete these until references/imports/workflows are checked:

- older SolWorldz and Purple Diamond Crew workflows;
- older ecosystem release tools/build folders;
- duplicated website/hub folders;
- diagnostics/evidence needed to verify ownership/deployment history;
- legacy image folders that may contain the only provenance for a protected identity;
- historical token evidence.

Rule: if a file is not referenced by runtime, canonical build, approved reference provenance, verified deployment, rollback, or evidence/audit needs, it is eligible for deletion after dependency proof.

## File Library rule

ChatGPT File Library is treated as reference/evidence storage, not as the active build source. Only the latest approved authority and explicitly selected reference assets may influence a build. Older drafts and duplicate images are ignored unless needed for provenance. Repository production code must never scrape or guess from arbitrary library duplicates.
