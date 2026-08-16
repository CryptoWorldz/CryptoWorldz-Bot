# OneWorldz 19-Destination Live Approval Audit

Audit date: 2026-08-16
Standard: JayJayTeamDev × ChatGPT Approval Rating
Pass threshold: 85/100

## Fleet result

- Destinations in locked plan: 19
- Purpose-correct live approvals: 18
- Not yet approved: 1
- Full-fleet approval: NOT YET

| Destination | Rating | Result | Live proof |
|---|---:|---|---|
| OneWorldz | 100/100 | PASS | HTTPS 200, branded live page, mobile viewport, clean content |
| CryptoWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| SolWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| EthWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| BaseWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| BNBWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| XRPWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| SuiWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| HyperWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| RobinWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| HodlerWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| HodlerGalaxy | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| Purple Diamond Crew | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| FoodWorldz | 0/100 current live gate | FAIL / PENDING | Public HTTPS currently returns TLSV1_ALERT_INTERNAL_ERROR while registrar/DNS propagation workflow is still running |
| DonateWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| ImpactBased | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| Law.OneWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| Learn.OneWorldz | 100/100 | PASS | HTTPS 200, exact production title, mobile viewport, clean content |
| CryptoBotz Command Centre | 100/100 protected-purpose PASS | PASS | Root HTTPS 200 JSON service health; /miniapp/ HTTPS 200 HTML, title `CryptoWorldz Command Centre`, mobile viewport present, CryptoWorldz + ZED markers present |

## Important interpretation

The generic webpage audit initially scored CryptoBotz at 60/100 because the protected root intentionally returns JSON rather than a normal HTML webpage. A dedicated protected-service audit then verified both the root service and the actual `/miniapp/` interface, so CryptoBotz is purpose-correct and approved.

FoodWorldz is the only current blocker. Its Spaceship API credentials, registrar ownership, nameserver switch, DNS record save, and registrar control-plane proof have already passed. The active workflow is still waiting for public nameserver/A-record propagation, after which HTTPS/SSL must pass before FoodWorldz receives final approval.
