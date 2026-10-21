# Worldz repository integrity audit — 21 October 2026

## Confirmed scope
- Retrieved complete tracked Git tree: 989 files, 199 directories, 94 GitHub Actions workflows.
- `DOMAINS.txt`: 18 unique registered site roots, all with `index.html`.
- Additional roots: `worldzhq.com`, `worldz.live`, and `launchpad.cryptoworldz.xyz`, each with `index.html`.
- Previous audit run `39530321732`: all 18 registered domain homepages returned HTTPS 200 and contained Worldz material. This is **not** proof of every linked page or of absence of stale branding.
- Of the most recent 100 GitHub Actions runs inspected: 38 successful, 31 failed, 29 skipped, 2 cancelled. These figures are for that sample only.

## Direct fixes included in this repair branch
1. Add a root `.gitignore` for credentials, dependencies, build products, log files and temporary data (already committed files are **not** untracked by this change).
2. Replace broken npm scripts referring to `apps/oneworldz-ecosystem-release`, `tools/verify-deployment-structure.mjs` and `tools/verify-oneworldz-canonical.mjs`. A new read-only structural validator verifies 18+3 public roots.
3. Add a pull-request integrity workflow running JavaScript syntax, Python compilation, Node tests and a tracked sensitive-filename check without requesting production secrets.
4. Fix LaunchPad workflow's fee-minimum assertion to match the checked-in config (0.25%, not 0.5%). Do **not** change the actual pricing config as a workaround.
5. Make HQ/Live HTTPS verification check site-specific content markers; a generic HTTP 200 / arbitrary HTML page no longer counts as Worldz deployed. Update its checkout action to the Node 24-compatible version.
6. Add README and security guidance documenting source of truth, production safeguards, and the difference between uploaded assets and real public availability.

## Independent failures still requiring separate action
- Workflow `39530111558`: SFTP uploads for WorldzHQ.com and Worldz.live succeeded. HQ passed HTTPS; Worldz.live failed TLS handshake (server alert 80). Diagnostic `39530492977` showed HQ resolving to `191.96.144.14` and Worldz.live connecting to `145.223.108.40`; restoring SSL requires Hostinger server-side certificate and site/DNS validation. Source changes cannot directly install that certificate.
- Workflow `39527424595`: the 18-site ecosystem upload and basic live checks reported many successes, but a subsequent additional URL fetched HTTP 404 without logging which URL. Its deployment-check script needs better contextual errors and the missing target must be corrected before declaring success.
- Workflow `39520100690`: LaunchPad gate rejected the checked-in minimum project trading fee of 0.25% because the assertion still demanded 0.5%. The assertion is corrected in this branch. Other gates still require running.
- Some legacy Hostinger deployment scripts and inline GitHub workflow uploaders use `ssl._create_unverified_context()` (certificate verification disabled); these remain a security and configuration issue. They must migrate to pinned-host-key SFTP or verified-hostname FTPS before being treated as secure.
- There are 94 historical workflows. This branch does not delete workflows, reorganise treasury/security code, mass-rewrite visual content, or force production deployments. Removing or replacing functioning projects without identifying their owners and routes is unsafe.

## Deployment controls
Review the branch and its CI before merge. A merge may trigger independent production workflows that watch workflow/source files. Preserve the existing `hope-chest` and special-purpose community content. Never merge a change solely to re-trigger a failed deployment whose blocker is outside source code.
