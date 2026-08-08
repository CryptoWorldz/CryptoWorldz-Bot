const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const FORBIDDEN_KEY = /(private.?key|secret|seed|mnemonic|signed.?payload|recovery.?phrase)/i;
const MANIPULATION_KEY = /(multi.?wallet|randomi[sz]ed|wash.?trad|artificial.?volume|circular.?trad|volume.?boost|stealth.?wallet|wallet.?rotation)/i;

export class AutoSafetyError extends Error {
  constructor(message, code = "AUTO_SAFETY_REJECTED") {
    super(message);
    this.name = "AutoSafetyError";
    this.code = code;
  }
}

function inspectObject(value, path = "request") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const fullPath = `${path}.${key}`;
    if (FORBIDDEN_KEY.test(key)) {
      throw new AutoSafetyError(
        `Auto never accepts private keys, seed phrases or signed payloads (${fullPath}).`,
        "AUTO_SECRET_REJECTED",
      );
    }
    if (MANIPULATION_KEY.test(key) && child !== false && child !== null && child !== "") {
      throw new AutoSafetyError(
        `Auto does not support multi-wallet or artificial-volume behaviour (${fullPath}).`,
        "AUTO_MANIPULATION_REJECTED",
      );
    }
    inspectObject(child, fullPath);
  }
}

function finiteNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new AutoSafetyError(`${name} must be a finite number.`, "AUTO_NUMBER_INVALID");
  }
  return number;
}

function positive(value, name) {
  const number = finiteNumber(value, name);
  if (number <= 0) {
    throw new AutoSafetyError(`${name} must be greater than zero.`, "AUTO_NUMBER_INVALID");
  }
  return number;
}

function cap(value, limit, name) {
  const numericLimit = Number(limit);
  if (Number.isFinite(numericLimit) && numericLimit > 0 && value > numericLimit) {
    throw new AutoSafetyError(`${name} exceeds the owner-approved limit.`, "AUTO_CAP_EXCEEDED");
  }
}

export function validateBuyProposal(proposal, settings = {}) {
  inspectObject(proposal);
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new AutoSafetyError("Auto requires one owner-approved buy proposal.", "AUTO_REQUEST_INVALID");
  }
  if (String(proposal.side || "").toLowerCase() !== "buy") {
    throw new AutoSafetyError("Auto is buy-only. Selling is disabled.", "AUTO_SELL_REJECTED");
  }
  if (String(proposal.network || "").toLowerCase() !== "solana") {
    throw new AutoSafetyError("Auto currently accepts owner-approved Solana buys only.", "AUTO_NETWORK_REJECTED");
  }
  if (!BASE58_ADDRESS.test(String(proposal.tokenMint || ""))) {
    throw new AutoSafetyError("The token mint is not a valid Solana address.", "AUTO_TOKEN_INVALID");
  }
  if (proposal.walletAddress && !BASE58_ADDRESS.test(String(proposal.walletAddress))) {
    throw new AutoSafetyError("The public wallet address is not valid.", "AUTO_WALLET_INVALID");
  }

  const inputCurrency = String(proposal.inputCurrency || "").toUpperCase();
  if (!["SOL", "USDC"].includes(inputCurrency)) {
    throw new AutoSafetyError("Input currency must be SOL or USDC.", "AUTO_CURRENCY_REJECTED");
  }
  const amountPerBuy = positive(proposal.amountPerBuy, "Amount per buy");
  const orderCount = positive(proposal.orderCount, "Order count");
  if (!Number.isSafeInteger(orderCount) || orderCount > 10000) {
    throw new AutoSafetyError("Order count must be a whole number from 1 to 10,000.", "AUTO_COUNT_INVALID");
  }
  const intervalMinutes = positive(proposal.intervalMinutes, "Interval");
  if (!Number.isSafeInteger(intervalMinutes)) {
    throw new AutoSafetyError("Interval must be a whole number of minutes.", "AUTO_INTERVAL_INVALID");
  }
  const slippageBps = positive(proposal.slippageBps, "Slippage");
  const priceImpactBps = positive(proposal.priceImpactBps, "Price impact");
  const liquidityUsd = proposal.liquidityUsd === undefined
    ? null
    : finiteNumber(proposal.liquidityUsd, "Liquidity");

  const minimumInterval = Math.max(15, Number(settings.min_interval_minutes) || 60);
  if (intervalMinutes < minimumInterval) {
    throw new AutoSafetyError(
      `Interval must be at least ${minimumInterval} minutes.`,
      "AUTO_INTERVAL_REJECTED",
    );
  }
  const maxSlippage = Number(settings.max_slippage_bps) || 300;
  if (slippageBps > maxSlippage) {
    throw new AutoSafetyError("Slippage exceeds the owner-approved limit.", "AUTO_SLIPPAGE_REJECTED");
  }
  const maxImpact = Number(settings.max_price_impact_bps) || 500;
  if (priceImpactBps > maxImpact) {
    throw new AutoSafetyError(
      "Price impact exceeds the owner-approved limit.",
      "AUTO_PRICE_IMPACT_REJECTED",
    );
  }
  const minimumLiquidity = Number(settings.min_liquidity_usd) || 0;
  if (minimumLiquidity > 0 && (liquidityUsd === null || liquidityUsd < minimumLiquidity)) {
    throw new AutoSafetyError(
      "Liquidity is below the owner-approved minimum.",
      "AUTO_LIQUIDITY_REJECTED",
    );
  }

  const totalBudget = amountPerBuy * orderCount;
  cap(amountPerBuy, settings.max_order_amount, "Amount per buy");
  cap(totalBudget, settings.max_monthly_amount, "Total schedule budget");

  return Object.freeze({
    side: "buy",
    network: "solana",
    tokenMint: String(proposal.tokenMint),
    walletAddress: proposal.walletAddress ? String(proposal.walletAddress) : null,
    inputCurrency,
    amountPerBuy,
    orderCount,
    totalBudget,
    intervalMinutes,
    slippageBps,
    priceImpactBps,
    liquidityUsd,
    externalSignerRequired: true,
    sellingEnabled: false,
    artificialVolumeEnabled: false,
  });
}

export function createAutoController({ repository, externalSigner = null }) {
  if (!repository) throw new Error("Auto requires the command-centre repository.");

  async function status() {
    return repository.getAutoStatus();
  }

  async function prepare(proposal) {
    const current = await repository.getAutoStatus();
    if (!current.settings) {
      throw new AutoSafetyError("Auto owner settings do not exist.", "AUTO_SETTINGS_MISSING");
    }
    const normalized = validateBuyProposal(proposal, current.settings);
    return {
      accepted: true,
      intent: normalized,
      executionReady: Boolean(
        current.settings.enabled &&
          current.settings.execution_enabled &&
          !current.settings.paused &&
          !current.settings.emergency_stop &&
          current.settings.wallet_connected &&
          externalSigner,
      ),
      nextAction: externalSigner
        ? "Owner confirmation is required before the external signer is called."
        : "Connect a separate external signer; never place a private key in this service.",
    };
  }

  return { prepare, status };
}
