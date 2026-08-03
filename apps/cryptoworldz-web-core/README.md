# CryptoWorldz Web Core

A dependency-free, multi-domain website shell for:

- CryptoWorldz total markets
- Individual blockchain World DEX pages
- ImpactBased public portal
- OneWorldz mission headquarters
- HodlerWorldz portfolio placeholder

The same files adapt automatically from the current hostname. Token and project data are read from the existing CryptoWorldz-Bot Supabase project using its public, read-only registry tables.

## Local preview

```bash
python3 -m http.server 4173
```

Open:

- `http://localhost:4173/?world=cryptoworldz&mode=markets`
- `http://localhost:4173/?world=solworldz&mode=world`
- `http://localhost:4173/?world=impactbased&mode=impact`
- `http://localhost:4173/?world=oneworldz&mode=mission`
- `http://localhost:4173/?world=hodlerworldz&mode=portfolio`

## Security

- Only the Supabase publishable key is present in browser code.
- Registry tables allow public SELECT only through RLS.
- No service-role key, wallet private key or recovery phrase belongs in this app.
- Wallet login is intentionally a Phase 2 placeholder.

See `docs/DEPLOYMENT.md` and `docs/REGISTRY.md`.
