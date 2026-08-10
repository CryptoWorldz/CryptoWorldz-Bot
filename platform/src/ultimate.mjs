const DEFAULT_TIMEZONE = "Australia/Sydney";
const DEFAULT_FUNDING_HOUR = 18;
const DEFAULT_FUNDING_MINUTE = 30;
const DEFAULT_WEEKDAYS = Object.freeze([1, 2, 3, 4, 5]);

export const ULTIMATE_ALLOCATION_BPS = Object.freeze({
  treasury: 3500,
  dev_grace_operations: 2500,
  rewards: 2000,
  owner_diamond_buy: 2000,
});

export const ULTIMATE_SIGNERS = Object.freeze([
  Object.freeze({ telegramId: 8029135300, handle: "JayJayTeamDev", role: "owner", immutable: true }),
  Object.freeze({ telegramId: 7615025841, handle: "stepper_web_3", role: "approver", immutable: false }),
  Object.freeze({ telegramId: 8604306923, handle: "Re_me_dy", role: "approver", immutable: false }),
]);

export const OWNER_REQUIRED_PROPOSAL_TYPES = Object.freeze(new Set([
  "funding_rail_change",
  "wallet_change",
  "token_launch",
  "limits_change",
  "disable_emergency_stop",
  "signer_change",
]));

export const ULTIMATE_TOKEN_FEE_POLICY = Object.freeze({
  feeModel: "creator_fee",
  automaticMarketSupport: false,
  initialCreatorFeeBps: 100,
  growthCreatorFeeBps: 75,
  matureCreatorFeeBps: 50,
  hardCreatorFeeCapBps: 300,
  proceedsAllocationBps: Object.freeze({
    charity: 3000,
    liquidity: 2500,
    dev: 2000,
    team: 1500,
    buyback_burn_reserve: 1000,
  }),
  buybackPolicy: Object.freeze({
    automatic: false,
    priceTriggered: false,
    volumeTriggered: false,
    approvalRequired: true,
    disclosureRequired: true,
  }),
});

export class UltimateSafetyError extends Error {
  constructor(message, code = "ULTIMATE_SAFETY_REJECTED") {
    super(message);
    this.name = "UltimateSafetyError";
    this.code = code;
  }
}

function finitePositive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new UltimateSafetyError(`${name} must be greater than zero.`, "ULTIMATE_AMOUNT_INVALID");
  }
  return number;
}

function assertPublicOnly(value, path = "request") {
  if (!value || typeof value !== "object") return;
  const forbidden = /(private.?key|seed|mnemonic|recovery.?phrase|bank.?password|online.?banking.?password|cvv|card.?number|api.?secret|secret.?key|signed.?payload)/i;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.test(key) && child !== null && child !== "") {
      throw new UltimateSafetyError(
        `Ultimate never accepts banking credentials, private keys or signing secrets (${path}.${key}).`,
        "ULTIMATE_SECRET_REJECTED",
      );
    }
    assertPublicOnly(child, `${path}.${key}`);
  }
}

export function validateAllocationBps(allocation = ULTIMATE_ALLOCATION_BPS) {
  const entries = Object.entries(allocation || {});
  if (!entries.length) {
    throw new UltimateSafetyError("At least one allocation is required.", "ULTIMATE_ALLOCATION_INVALID");
  }
  let total = 0;
  for (const [key, value] of entries) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0 || number > 10000) {
      throw new UltimateSafetyError(`Allocation ${key} must be whole basis points.`, "ULTIMATE_ALLOCATION_INVALID");
    }
    total += number;
  }
  if (total !== 10000) {
    throw new UltimateSafetyError("Allocations must total exactly 10,000 basis points.", "ULTIMATE_ALLOCATION_TOTAL_INVALID");
  }
  return Object.freeze(Object.fromEntries(entries));
}

function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zonedDateTimeToUtc({ year, month, day, hour, minute, second = 0 }, timeZone) {
  const desiredWallClock = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desiredWallClock;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(guess), timeZone);
    const actualWallClock = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const difference = desiredWallClock - actualWallClock;
    guess += difference;
    if (difference === 0) break;
  }
  return new Date(guess);
}

export function nextFundingWindow(now = new Date(), settings = {}) {
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) {
    throw new UltimateSafetyError("A valid current time is required.", "ULTIMATE_TIME_INVALID");
  }
  const timeZone = String(settings.timezone || DEFAULT_TIMEZONE);
  const hour = Number.isSafeInteger(Number(settings.fundingHour)) ? Number(settings.fundingHour) : DEFAULT_FUNDING_HOUR;
  const minute = Number.isSafeInteger(Number(settings.fundingMinute)) ? Number(settings.fundingMinute) : DEFAULT_FUNDING_MINUTE;
  const weekdays = new Set(Array.isArray(settings.weekdays) ? settings.weekdays.map(Number) : DEFAULT_WEEKDAYS);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new UltimateSafetyError("Funding time is invalid.", "ULTIMATE_TIME_INVALID");
  }
  const local = zonedParts(current, timeZone);
  const baseLocalDate = new Date(Date.UTC(local.year, local.month - 1, local.day));

  for (let offset = 0; offset <= 14; offset += 1) {
    const localDate = new Date(baseLocalDate.getTime() + offset * 86400000);
    const weekday = localDate.getUTCDay();
    if (!weekdays.has(weekday)) continue;
    const candidate = zonedDateTimeToUtc({
      year: localDate.getUTCFullYear(),
      month: localDate.getUTCMonth() + 1,
      day: localDate.getUTCDate(),
      hour,
      minute,
      second: 0,
    }, timeZone);
    if (candidate.getTime() > current.getTime()) {
      return Object.freeze({
        timezone: timeZone,
        scheduledAt: candidate.toISOString(),
        localHour: hour,
        localMinute: minute,
        weekday,
      });
    }
  }
  throw new UltimateSafetyError("No valid funding window was found.", "ULTIMATE_TIME_INVALID");
}

export function splitFundingAmount(amountAud, allocation = ULTIMATE_ALLOCATION_BPS) {
  const amount = finitePositive(amountAud, "Funding amount");
  const normalized = validateAllocationBps(allocation);
  const cents = Math.round(amount * 100);
  let allocated = 0;
  const keys = Object.keys(normalized);
  const splits = {};
  keys.forEach((key, index) => {
    const value = index === keys.length - 1
      ? cents - allocated
      : Math.floor((cents * normalized[key]) / 10000);
    allocated += value;
    splits[key] = value / 100;
  });
  return Object.freeze({ currency: "AUD", total: cents / 100, splits: Object.freeze(splits) });
}

export function approvalState({ proposalType, approvals = [], rejections = [], signers = ULTIMATE_SIGNERS } = {}) {
  const activeSigners = signers.filter((signer) => signer && signer.telegramId && signer.role !== "disabled");
  const signerIds = new Set(activeSigners.map((signer) => Number(signer.telegramId)));
  const owner = activeSigners.find((signer) => signer.role === "owner" && signer.immutable === true);
  if (!owner) {
    throw new UltimateSafetyError("The immutable owner signer is required.", "ULTIMATE_OWNER_REQUIRED");
  }
  if (activeSigners.length !== 3) {
    throw new UltimateSafetyError("Ultimate requires exactly three active signers.", "ULTIMATE_SIGNER_COUNT_INVALID");
  }
  const approved = new Set(approvals.map(Number).filter((id) => signerIds.has(id)));
  const rejected = new Set(rejections.map(Number).filter((id) => signerIds.has(id)));
  const ownerRequired = OWNER_REQUIRED_PROPOSAL_TYPES.has(String(proposalType || ""));

  if (approved.size >= 2 && (!ownerRequired || approved.has(Number(owner.telegramId)))) {
    return Object.freeze({ status: "approved", approvals: approved.size, rejections: rejected.size, ownerRequired });
  }
  if (rejected.size >= 2) {
    return Object.freeze({ status: "rejected", approvals: approved.size, rejections: rejected.size, ownerRequired });
  }
  return Object.freeze({ status: "pending_approval", approvals: approved.size, rejections: rejected.size, ownerRequired });
}

export function validateUltimateProposal(proposal = {}) {
  assertPublicOnly(proposal);
  const type = String(proposal.type || "").trim();
  if (!type) throw new UltimateSafetyError("Proposal type is required.", "ULTIMATE_PROPOSAL_INVALID");
  if (proposal.executionEnabled === true || proposal.bypassApproval === true || proposal.autoSign === true) {
    throw new UltimateSafetyError("Ultimate cannot bypass approval or silently enable execution.", "ULTIMATE_APPROVAL_BYPASS_REJECTED");
  }
  return Object.freeze({
    ...proposal,
    type,
    executionEnabled: false,
    approvalThreshold: 2,
    signerCount: 3,
    externalAuthorizationRequired: true,
    ownerRequired: OWNER_REQUIRED_PROPOSAL_TYPES.has(type),
  });
}

export function tokenCreatorFeeForHistory({ completedTrades = 0, liquidityHealthy = false } = {}) {
  const trades = Math.max(0, Math.floor(Number(completedTrades) || 0));
  if (trades >= 500 && liquidityHealthy) return ULTIMATE_TOKEN_FEE_POLICY.matureCreatorFeeBps;
  if (trades >= 100 && liquidityHealthy) return ULTIMATE_TOKEN_FEE_POLICY.growthCreatorFeeBps;
  return ULTIMATE_TOKEN_FEE_POLICY.initialCreatorFeeBps;
}

export function validateTokenFeePolicy(policy = ULTIMATE_TOKEN_FEE_POLICY) {
  validateAllocationBps(policy.proceedsAllocationBps);
  const fee = Number(policy.initialCreatorFeeBps);
  if (!Number.isSafeInteger(fee) || fee < 0 || fee > Number(policy.hardCreatorFeeCapBps || 300)) {
    throw new UltimateSafetyError("Creator fee exceeds the Ultimate adoption cap.", "ULTIMATE_TOKEN_FEE_INVALID");
  }
  if (policy.buybackPolicy?.automatic || policy.buybackPolicy?.priceTriggered || policy.buybackPolicy?.volumeTriggered) {
    throw new UltimateSafetyError(
      "Buyback/burn reserves cannot be executed automatically from price or volume signals.",
      "ULTIMATE_MARKET_SUPPORT_REJECTED",
    );
  }
  return true;
}

export function ultimatePublicBlueprint() {
  validateAllocationBps(ULTIMATE_ALLOCATION_BPS);
  validateTokenFeePolicy(ULTIMATE_TOKEN_FEE_POLICY);
  return Object.freeze({
    name: "Command Centre Ultimate™",
    version: "foundation-v1",
    timezone: DEFAULT_TIMEZONE,
    fundingSchedule: Object.freeze({ weekdays: DEFAULT_WEEKDAYS, hour: 18, minute: 30 }),
    allocationsBps: ULTIMATE_ALLOCATION_BPS,
    multisig: Object.freeze({ threshold: 2, signers: 3, immutableOwner: "JayJayTeamDev" }),
    executionEnabled: false,
    secretCustody: "external_only",
    tokenFeePolicy: ULTIMATE_TOKEN_FEE_POLICY,
  });
}
