# WorldzHQ.com and Worldz.live — public hosting repair

Verified on 2026-10-16 from GitHub Actions diagnostic run 38870952804.

## Observed

- `worldzhq.com` and `worldz.live` both resolve to `34.216.117.25` and `54.149.79.189`.
- Both serve an HTTP 200 page that fails the Worldz content marker check.
- Both time out on TCP 443 / HTTPS.
- Neither `www` hostname resolves.
- `donateworldz.com` resolves to other addresses, redirects HTTP to HTTPS and serves Worldz content with HTTPS 200.
- FTPS deployment run 38870489042 **uploaded** the public files for both new domains to Hostinger, but failed the public HTTPS verification.

## Interpretation

The public DNS for the two new domains likely points to an unrelated landing/parking service rather than the actual Hostinger website that receives the uploads. HTTPS is not publicly available on the currently resolved endpoints. Successful FTP uploads do not prove the public DNS routes to those files.

## Safe recovery steps

1. In Hostinger, read the **actual website IP/address** for `worldzhq.com` and `worldz.live` from their website details. Do not assume it matches DonateWorldz.
2. Read the authoritative DNS zone and registrar nameservers for each new domain, including whether DNS is managed outside Hostinger. Preserve MX, TXT, SPF, DKIM, DMARC, verification and all unrelated records.
3. Compare the apex A/AAAA records with the actual hosting website address. Confirm the exact planned record updates before changing them. Do not change nameservers or reset a DNS zone.
4. Check Hostinger's website attachment/domain mapping and SSL certificate provisioning for both names.
5. After correcting routing, verify that `https://worldzhq.com/` and `https://worldz.live/` return the **expected page content**, not merely status 200.
6. Re-run the existing GitHub deployment workflow only after the domain routing is correct. Review the FTP TLS setup: its present unverified certificate context is a temporary compatibility measure; switch to a certificate-valid FTP hostname when available.

## References

- Public diagnostic: https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/38870952804
- Upload succeeded but public verification failed: https://github.com/CryptoWorldz/CryptoWorldz-Bot/actions/runs/38870489042

**No DNS or hosting changes were made by this document.**
