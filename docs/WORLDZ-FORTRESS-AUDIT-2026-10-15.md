# Worldz Fortress — Discovery and Safety Baseline (15 October 2026)

## Verified inventory sources
- Repository: `CryptoWorldz/CryptoWorldz-Bot`, main branch (1,154 tree entries; tree not truncated).
- `DOMAINS.txt`: 18 deployment entries; includes 15 root domains and 3 subdomains.
- Top-level domain-labelled folders: 17 root domains and 6 explicit subdomains (23 hostnames).
- Distinct root domain names observed: `oneworldz.com`, `cryptoworldz.xyz`, `solworldz.xyz`, `ethworldz.xyz`, `baseworldz.xyz`, `bnbworldz.xyz`, `xrpworldz.xyz`, `suiworldz.xyz`, `hyperworldz.xyz`, `robinworldz.xyz`, `hodlerworldz.xyz`, `hodlergalaxy.xyz`, `purplediamondcrew.com`, `foodworldz.com`, `donateworldz.com`, `worldzhq.com`, `worldzlaunch.com`.
- Explicit subdomains: `impactbased.oneworldz.com`, `law.oneworldz.com`, `learn.oneworldz.com`, `bitworldz.cryptoworldz.xyz`, `launchpad.cryptoworldz.xyz`, `spam2ham.cryptoworldz.xyz`.
- Additional host referenced in production workflow: `cryptobotz.cryptoworldz.xyz` (not a top-level folder).
- **No domain ownership, DNS records, hosting availability, certificates, or real traffic independently verified.** Distinguish domain names from deployed websites and DNS names.
- `worldzhq.com/domain-plan.json` and `worldzlaunch.com/domain-plan.json` say `PREPARED_NOT_PROVEN_LIVE`. Preserve current compatibility hosts pending evidence.
- Main `deploy.yml` is bound to 18 entries in `DOMAINS.txt`, and names an FTP credential set in GitHub environment secrets. These are configuration references, **not proof that the credentials are present or valid**.

## Supabase snapshot
- One visible project: `CryptoWorldz-Bot` (`hknymhhyqldtzmplzuzh`), healthy in `ap-southeast-2`.
- 31 active Edge Functions; 28 configured with `verify_jwt=false`. **This is configuration, not proof of unauthenticated access**; inspect handler-specific alternative protections and intentional public endpoints.
- Security advisor: 44 findings across three categories:
  - 20 anonymous-executable `SECURITY DEFINER` functions (WARN)
  - 5 authenticated-executable `SECURITY DEFINER` functions (WARN)
  - 19 RLS-enabled tables without a policy (INFO; may intentionally deny all)
- Performance advisor: 215 findings:
  - 29 unindexed foreign keys, 8 auth RLS initplan, 126 unused indexes, 51 multiple permissive policies, 1 duplicate index.
- No automatic revoke/grant/policy changes made.

## Priority threat model / fortress architecture
1. **Inventory and evidence**: source-controlled hostname registry with role, owner/registrar, DNS host, hosting, target application, deployment workflow, certificate, redirect/CORS origin, recovery contact, verified-at, and unknown flags. Confirm using registrar/DNS/hosting reads; never infer ownership from repository folders.
2. **Access control**: require least-privilege GitHub Actions environments, branch protections, reviewed PRs, short-lived credentials where available, and no credentials in public source/CI logs. Audit `HOSTINGER_API_TOKEN`, FTP credentials, Supabase and Stripe use without exposing secrets.
3. **DB/RPC audit**: inspect each reported anon-executable privileged function's grants, caller authentication checks and use by production. Recommend changes individually with regression checks; avoid bulk revokes.
4. **Edge Function audit**: classify all 31 by public read, authenticated app, webhook, or internal operation; validate JWT / HMAC / Telegram initData / allowlist / rate limit as appropriate. A disabled platform JWT setting can be acceptable for intentionally public endpoints.
5. **Domain isolation**: secure origin/TLS, deliberate routing and redirects, exact CORS allowlists, independent failure domains and app-specific content security policy; protection against open redirects and domain takeover.
6. **Deployment**: static build and link checks, mobile checks, smoke tests, dry-run, deploy approval, post-deploy verification and rollback. Preserve the existing production environment and host compatibility until new hosting is verified.
7. **Operations**: uptime/expiry/cert monitors, logs without sensitive data, encrypted backups and tested restoration, incident runbooks and central status page.

## Deployment gates
- A code commit alone is not proof a host is live.
- No production DNS, payment, wallet, hosting, authorization, user record or public credential changes until the specific impact is reviewed and verified.
- High-risk domain cutovers, payment and token execution require explicit separate review.
- Start by reconciling the deployment's 18-entry contract with the 23 explicit host folders and additional workflow hostnames; look for the roughly 28 subdomains referenced by the owner in DNS and provider records.
