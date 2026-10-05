import { Connection, PublicKey } from "@solana/web3.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import BN from "bn.js";

const RPC = process.env.SOLANA_RPC_URL || "https://hknymhhyqldtzmplzuzh.supabase.co/functions/v1/worldz-solana-rpc";
const connection = new Connection(RPC, "confirmed");
const cpAmm = new CpAmm(connection);

const MARKETS = [
  {
    symbol: "WLDZ",
    mint: "AHYnPvXMsdWxjQQrS9j5P631WWS8xBVYC57jXB6hrJ6U",
    pool: "GCFKk1H5Z8EfxFuAvDEXTHn8b28deUA7HxVRsipjfPiJ"
  },
  {
    symbol: "RVIV",
    mint: "DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R",
    pool: "YWEMDsd6o3dm8uXNnmnWWU3c1UtFqDUKEMfbQ512i5c"
  }
];

const SOL_INPUTS = [0.05, 0.1, 0.135, 0.2, 0.25, 0.27, 0.28];
const BUY_INPUTS = [0.000001,0.0000025,0.000005,0.00001,0.000025,0.00005,0.0001,0.00025,0.0005,0.001,0.0025,0.005,0.01,0.02,0.05,0.1,0.2,0.27];

function human(raw, decimals) {
  const n = BigInt(raw.toString());
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const frac = String(n % base).padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}

async function decimalsOf(mint) {
  const info = await connection.getParsedAccountInfo(mint, "confirmed");
  const decimals = info.value?.data?.parsed?.info?.decimals;
  if (!Number.isInteger(decimals)) throw new Error(`Unable to read decimals for ${mint.toBase58()}`);
  return decimals;
}

for (const market of MARKETS) {
  const poolPk = new PublicKey(market.pool);
  const mintPk = new PublicKey(market.mint);
  const state = await cpAmm.fetchPoolState(poolPk);
  const [aDecimals, bDecimals] = await Promise.all([
    decimalsOf(state.tokenAMint),
    decimalsOf(state.tokenBMint)
  ]);

  console.log(`WORLDZ_LP_AUDIT market=${market.symbol}`);
  console.log(`pool=${market.pool}`);
  console.log(`tokenA=${state.tokenAMint.toBase58()} decimalsA=${aDecimals}`);
  console.log(`tokenB=${state.tokenBMint.toBase58()} decimalsB=${bDecimals}`);
  console.log(`expectedBaseMintMatch=${state.tokenAMint.equals(mintPk)}`);
  console.log(`collectFeeMode=${Number(state.collectFeeMode)}`);
  console.log(`poolStatus=${Number(state.poolStatus)}`);
  console.log(`activationType=${Number(state.activationType)} activationPoint=${state.activationPoint?.toString?.() ?? String(state.activationPoint)}`);
  console.log(`currentSlot=${await connection.getSlot("confirmed")} currentUnix=${Math.floor(Date.now()/1000)}`);
  console.log(`poolTokenA=${human(state.tokenAAmount, aDecimals)}`);
  console.log(`poolTokenB=${human(state.tokenBAmount, bDecimals)}`);
  console.log(`sqrtPrice=${state.sqrtPrice.toString()}`);
  console.log(`sqrtMinPrice=${state.sqrtMinPrice.toString()}`);
  console.log(`sqrtMaxPrice=${state.sqrtMaxPrice.toString()}`);

  for (const sol of SOL_INPUTS) {
    const lamports = BigInt(Math.round(sol * 1e9));
    const quote = await cpAmm.getDepositQuote({
      inAmount: new BN(lamports.toString()),
      isTokenA: false,
      sqrtPrice: state.sqrtPrice,
      minSqrtPrice: state.sqrtMinPrice,
      maxSqrtPrice: state.sqrtMaxPrice,
      collectFeeMode: state.collectFeeMode,
      tokenAAmount: state.tokenAAmount,
      tokenBAmount: state.tokenBAmount,
      liquidity: state.liquidity
    });
    console.log(
      `depositQuote market=${market.symbol} requestedSOL=${sol} consumedSOL=${human(quote.consumedInputAmount, bDecimals)} requiredBase=${human(quote.outputAmount, aDecimals)} liquidityDelta=${quote.liquidityDelta.toString()}`
    );
  for (const sol of BUY_INPUTS) {
    const lamports = BigInt(Math.round(sol * 1e9));
    try {
      const quote = cpAmm.getQuote({
        inAmount: new BN(lamports.toString()),
        inputTokenMint: state.tokenBMint,
        slippageBps: 100,
        poolState: state
      });
      console.log(
        `buyQuote market=${market.symbol} inputSOL=${sol} consumedSOL=${human(quote.consumedInAmount, bDecimals)} outputBase=${human(quote.swapOutAmount, aDecimals)} feeSOL=${human(quote.totalFee, bDecimals)} priceImpactPct=${quote.priceImpact.toString()}`
      );
    } catch (error) {
      console.log(`buyQuote market=${market.symbol} inputSOL=${sol} error=${String(error?.message || error).replace(/\s+/g,"_")}`);
    }
  }
  }
}
