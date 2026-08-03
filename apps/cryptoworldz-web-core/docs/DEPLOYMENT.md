# Deployment Map

## One codebase, multiple domains

The app detects its domain using `config/worlds.js`.

| Domain | Experience |
|---|---|
| cryptoworldz.xyz | Total CryptoWorldz market centre |
| impactbased.oneworldz.com | ImpactBased public portal |
| oneworldz.com | Mission headquarters, no token charts |
| solworldz.xyz | SolWorldz dedicated DEX page |
| ethworldz.xyz | EthWorldz dedicated DEX page |
| baseworldz.xyz | BaseWorldz dedicated DEX page |
| bnbworldz.xyz | BNBWorldz dedicated DEX page |
| xrpworldz.xyz | XRPWorldz dedicated DEX page |
| suiworldz.xyz | SuiWorldz dedicated DEX page |
| hyperworldz.xyz | HyperWorldz dedicated DEX page |
| robinworldz.xyz | RobinWorldz dedicated DEX page |
| bitcoinworldz.xyz | BitcoinWorldz dedicated DEX page |
| hodlerworldz.xyz | Read-only portfolio placeholder |

## Required hosting behavior

1. Upload all files while preserving folders.
2. Serve `index.html` for the root.
3. Route unknown paths back to `index.html` or use the included `404.html` fallback.
4. Attach each domain to the same deployment or clone the exact package.
5. Keep HTTPS enabled.

## Launch workflow

1. Create the token using the approved launch model.
2. Verify the contract address and pair address on-chain.
3. Add the token record in `ecosystem_tokens`.
4. Set `launch_status` to `live` only after the contract address is present.
5. Add `dexscreener_url`, `trade_url`, launch disclosure fields and verification timestamp.
6. Every connected website updates from the same registry.
