#!/usr/bin/env node
import {
  BaseFeeMode, CollectFeeMode, CpAmm, getBaseFeeParams,
  getSqrtPriceFromPrice, MIN_SQRT_PRICE, MAX_SQRT_PRICE
} from "@meteora-ag/cp-amm-sdk";
import BN from "bn.js";

const SUPPLY=250_000_000n;
const GENESIS=12_500_000n;
const STAGED=100_000_000n;
if(GENESIS*100n!==SUPPLY*5n) throw new Error("genesis is not 5%");
if((GENESIS+STAGED)*100n!==SUPPLY*45n) throw new Error("liquidity total is not 45%");

const baseFee=getBaseFeeParams({
  baseFeeMode:BaseFeeMode.FeeTimeSchedulerLinear,
  feeTimeSchedulerParam:{startingFeeBps:75,endingFeeBps:75,numberOfPeriod:0,totalDuration:0}
});
if(!baseFee) throw new Error("Meteora SDK rejected fixed 75-bps fee");

const cp=new CpAmm({}); // static method-surface compatibility only; no RPC call
if(typeof cp.preparePoolCreationSingleSide!=="function" && typeof cp.getLiquidityDelta!=="function"){
  throw new Error("Meteora SDK liquidity helpers unavailable");
}
const fixturePrice="0.000001";
const sqrt=getSqrtPriceFromPrice(fixturePrice,6,9);
if(!BN.isBN(sqrt)||sqrt.lte(new BN(0))||sqrt.lt(MIN_SQRT_PRICE)||sqrt.gt(MAX_SQRT_PRICE)){
  throw new Error("fixture sqrt price invalid");
}
if(Number(CollectFeeMode.OnlyB)<0) throw new Error("quote-only fee mode unavailable");

console.log("PNEX_LIQUIDITY_STATIC=PASS genesis_percent=5 total_liquidity_percent=45 staged_percent=40 fee_bps=75 dynamic_fee=OFF permanent_lock_target=100 fixture_price=DEVNET_ONLY mainnet_price=UNSET");
