#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
c=json.loads((ROOT/"worldzpad-mainnet/phenix/pnex-staged-liquidity.v1.json").read_text())
e=[]
def r(x,m):
    if not x:e.append(m)
r(c["token"]["supplyTokens"]==250_000_000,"supply drift")
r(c["genesis"]["pnexTokens"]==12_500_000 and c["genesis"]["percentOfSupply"]==5,"genesis liquidity drift")
r(c["genesis"]["quoteSolAmount"] is None and c["genesis"]["openingPriceSolPerPnex"] is None,"do not invent mainnet SOL or price")
r(c["stagedReserve"]["pnexTokens"]==100_000_000 and c["stagedReserve"]["percentOfSupply"]==40,"staged reserve drift")
r(c["stagedReserve"]["combinedLiquidityPercent"]==45,"combined LP allocation drift")
r(c["expansionRule"]["minimumQuoteValueToPnexNotionalRatio"]==1.05,"+5% rule drift")
r(c["expansionRule"]["automaticMarketBuy"] is False,"automatic market buy must stay off")
r(c["lpQuoteReserve"]["mayFundGeneralOperations"] is False,"LP quote reserve cannot fund general ops")
r(c["lpQuoteReserve"]["mayAutoBuyPnex"] is False,"LP quote reserve cannot auto-buy PNEX")
r(c["permanentLock"]["targetPercentOfCreatorControlledLp"]==100,"LP lock target must be 100%")
r(c["permanentLock"]["removableCreatorLiquidityTarget"]==0,"creator removable liquidity target must be zero")
r(c["execution"]["mainnetExecutionEnabled"] is False and c["execution"]["autoBroadcast"] is False,"mainnet/auto broadcast must stay off")
if e: raise SystemExit("PNEX STAGED LIQUIDITY VALIDATION FAILED\n- "+"\n- ".join(e))
print("PNEX STAGED LIQUIDITY VALIDATION — SUCCESS")
print("Genesis: 5% / 12,500,000 PNEX; mainnet SOL and price intentionally unset")
print("Staged: 40% / 100,000,000 PNEX")
print("Expansion: committed quote value >= 105% of PNEX notional")
print("LP lock target: permanent 100% creator-controlled LP")
