# WORLDZ MASTER IMAGE LIBRARY — DEPLOYMENT CONTRACT

Status: staging gate for `worldz-consolidated-rollout-20260809`.

## Hard rules

- Use only approved CryptoWorldz / OneWorldz artwork supplied by JayJay in the build conversation.
- Do not substitute generic gradients, abstract placeholder art, emoji stand-ins, low-resolution cards, or newly invented imagery.
- Do not ship legacy `Crypto Universe` / `CryptoUniverse` branding.
- `Action Creates Smiles` is excluded from this rollout unless explicitly re-approved.
- Blockchain pages use their matching approved blockchain artwork and matching chain identity.
- RecoverYourDebt belongs to Robin Hood Chain.
- Image quality must match the established CryptoWorldz production standard: local/static deployment assets, no blurred remote-preview dependency.

## Required master assets

These destinations are deployment-stable names. Binary files must exist before any production workflow is allowed to pass.

- `apps/worldz-master-library/oneworldz/oneworldz-gpt.webp`
- `apps/worldz-master-library/oneworldz/oneworldz-master.webp`
- `apps/worldz-master-library/oneworldz/little-legend.webp`
- `apps/worldz-master-library/oneworldz/reagan-kauja.webp`
- `apps/worldz-master-library/oneworldz/hope-chest.webp`
- `apps/worldz-master-library/cryptoworldz/command-centre-five.webp`
- `apps/worldz-master-library/cryptoworldz/command-centre-leader-team.webp`
- `apps/worldz-master-library/cryptoworldz/zed-command-centre.webp`
- `apps/worldz-master-library/cryptoworldz/zed-auto.webp`
- `apps/worldz-master-library/cryptoworldz/grace.webp`
- `apps/worldz-master-library/cryptoworldz/impactbased.webp`
- `apps/worldz-master-library/cryptoworldz/cryptoworldz-basedbid.webp`
- `apps/worldz-master-library/cryptoworldz/we-need-you.webp`
- `apps/worldz-master-library/blockchains/bitworldz.webp`
- `apps/worldz-master-library/blockchains/solworldz.webp`
- `apps/worldz-master-library/blockchains/ethworldz.webp`
- `apps/worldz-master-library/blockchains/baseworldz.webp`
- `apps/worldz-master-library/blockchains/bnbworldz.webp`
- `apps/worldz-master-library/blockchains/xrpworldz.webp`
- `apps/worldz-master-library/blockchains/suiworldz.webp`
- `apps/worldz-master-library/blockchains/hyperworldz.webp`
- `apps/worldz-master-library/blockchains/robinworldz.webp`
- `apps/worldz-master-library/tokens/recover-your-debt.webp`
- `apps/worldz-master-library/tokens/uganda-unite.webp`
- `apps/worldz-master-library/tokens/robin-hood-law.webp`
- `apps/worldz-master-library/tokens/global-impact-alliance.webp`
- `apps/worldz-master-library/tokens/next-big-coin.webp`
- `apps/worldz-master-library/tokens/solmars.webp`
- `apps/worldz-master-library/tokens/solbud.webp`
- `apps/worldz-master-library/tokens/soltoken.webp`

## Page mapping

- OneWorldz: OneWorldz master imagery, OneWorldz GPT, Little Legend, Reagan/support imagery, Hope Chest.
- CryptoWorldz: existing proven production visual architecture plus Command Centre, Zed, Auto, Grace, ReCap/Based.bid partnership and ImpactBased sections.
- Purple Diamond Crew: Hope Chest hero/background with glass-style controls and action/community imagery.
- SolWorldz: approved SolWorldz blockchain banner plus Solana token collection artwork.
- EthWorldz/BaseWorldz/BNBWorldz/XRPWorldz/SuiWorldz/HyperWorldz/RobinWorldz: exact matching approved blockchain banner, not generic coming-soon art.

## Deployment gate

Production deployment must fail when any required file is absent, zero-byte, suspiciously small, or contains a forbidden legacy branding reference in HTML/JS/CSS source.
