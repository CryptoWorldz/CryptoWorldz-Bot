# OneWorldz / CryptoWorldz Live Cloud Deployment

Deployment date: 5 August 2026, Australia/Sydney

## Confirmed active Supabase Edge Functions

### Worldz Live Gateway

- Function: `worldz-live`
- Status: `ACTIVE`
- Public base URL: `https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-live/`
- Website source: immutable GitHub commit `9c4444a08337516525387fe9252e7393e33ba7b2`
- Hostinger Horizons credits used: `0`
- Registrar transfers: `0`
- Existing custom-domain files changed: `0`

Live prepared routes:

- `/oneworldz`
- `/cryptoworldz`
- `/purplediamondcrew`
- `/impactbased`
- `/law`
- `/learn`
- `/solworldz`
- `/ethworldz`
- `/baseworldz`
- `/bnbworldz`
- `/xrpworldz`
- `/suiworldz`
- `/hyperworldz`
- `/robinworldz`
- `/bitcoinworldz`
- `/bitworldz`
- `/hodlerworldz`
- `/test`

These are live cloud fallback routes. They do not represent custom-domain DNS attachment. The owned domains remain at their existing registrars and hosts until DNS or hosting deployment access is available.

### Diamond Buy Auto

- Function: `diamond-buy-auto`
- Status: `ACTIVE`
- JWT verification: enabled
- Additional access boundary: Supabase `service_role` only
- Owner Telegram ID: `8029135300`
- Mode: `safe_locked`
- Execution: disabled
- Signing: disabled
- Transaction construction: absent
- Transaction submission: absent
- Spending caps: zero
- Allowlisted tokens: zero

Available private operations:

- Status
- Simulation
- Pause
- Resume simulation
- Emergency stop

### Zed Integration

Zed now defaults to the Supabase Auto function using its existing `SUPABASE_SERVICE_ROLE_KEY`; no new deployment secret is required.

- Auto client commit: `1f728bf7e2d4287ef5445af433b20929a7d3ba97`
- Default Auto configuration commit: `db8c2baf89f019c5e4d9482e5a3e10679562fc9a`
- GitHub Zed verification: passed
- Dependency audit: passed
- Secret-file scan: passed

The GitHub workflow validates Zed but does not itself restart the Hostinger Node runtime. A live Zed runtime update depends on the existing Hostinger Git deployment/restart configuration.

## Database Safety

Auto database tables have RLS enabled and no public policies. This intentionally blocks public table access while allowing the service-role Edge Function to operate.

Database-enforced safeguards keep:

- `execution_enabled = false`
- `signing_enabled = false`
- transaction signatures `NULL`
- signed payloads `NULL`
- private-key references `NULL`
- `execution_attempted = false`

## Ownership Lock

- OneWorldz.com registrar: Spaceship
- OneWorldz.com hosting: Hostinger
- Transfer: prohibited unless separately authorised by Jason Wright / JayJayTeamDev
