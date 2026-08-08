# Worldz Production Media Contract

This bundle is the reference deployment pattern for future Worldz domains.

1. Each production domain owns its own static bundle and document root.
2. Required above-the-fold and card artwork must be present in the bundle before deployment.
3. Inline SVG is the guaranteed fallback layer for required visuals: it is resolution-independent and has no separate image request that can 404, cache stale, or decode badly.
4. Raster master artwork is optional enhancement only. It may replace a vector visual only after integrity checks pass for source dimensions, byte size and content hash.
5. Missing official token art must use an explicitly labelled pipeline visual. Never invent an official logo.
6. Production HTML is no-cache. Versioned static assets may be cached only after verification.
7. Deployment must verify the exact domain guard, take a rollback snapshot, upload, then verify the live page markers.
8. A site is not complete if a required visual is missing, blank or dependent on an unresolved runtime asset.

SolWorldz is the first domain using this contract. The same bundle + gate pattern is intended for the remaining Worldz deployments.
