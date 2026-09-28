const TIME_ZONE = "Australia/Sydney";

const ULTIMATE_SIGNERS = Object.freeze([
  Object.freeze({ handle: "JayJayTeamDev", role: "owner", immutable: true }),
  Object.freeze({ handle: "stepper_web_3", role: "approver", immutable: false }),
  Object.freeze({ handle: "Re_me_dy", role: "approver", immutable: false })
]);

const ULTIMATE_PROVIDER_CAPABILITIES = Object.freeze({
  westpac: Object.freeze({ role: "fiat_source", mode: "external_schedule_required", canAutoAuthorize: false, canHoldSecrets: false }),
  coinbase: Object.freeze({ role: "fiat_crypto_bridge", mode: "adapter_pending", canAutoAuthorize: false, canHoldSecrets: false }),
  squads: Object.freeze({ role: "multisig_approval", mode: "external_signing", canAutoAuthorize: false, canHoldSecrets: false }),
  jupiter: Object.freeze({ role: "solana_execution", mode: "adapter_pending", canAutoAuthorize: false, canHoldSecrets: false }),
  stripe: Object.freeze({ role: "business_operations", mode: "operations_only", canAutoAuthorize: false, canHoldSecrets: false })
});

function sydneyParts(date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function nextFundingWindow(now = new Date()) {
  const stepMs = 30 * 60 * 1000;
  let cursor = new Date(Math.ceil(now.getTime() / stepMs) * stepMs);
  for (let index = 0; index < 8 * 48; index += 1) {
    const parts = sydneyParts(cursor);
    if (!["Sat", "Sun"].includes(parts.weekday) && Number(parts.hour) === 18 && Number(parts.minute) === 30) {
      return {
        scheduledAt: cursor.toISOString(),
        timezone: TIME_ZONE,
        label: "Monday-Friday 18:30 Australia/Sydney"
      };
    }
    cursor = new Date(cursor.getTime() + stepMs);
  }
  throw new Error("Unable to resolve the next MAX funding-planner window.");
}

function ultimatePublicBlueprint() {
  return {
    name: "Command Centre Ultimate™",
    version: "v1-runtime-restored",
    plannerEnabled: true,
    executionEnabled: false,
    paused: true,
    emergencyStop: true,
    fundingSchedule: {
      timezone: TIME_ZONE,
      hour: 18,
      minute: 30,
      weekdays: [1, 2, 3, 4, 5]
    },
    allocationsBps: {
      treasury: 3500,
      dev_grace_operations: 2500,
      rewards: 2000,
      owner_diamond_buy: 2000
    },
    multisig: {
      threshold: 2,
      signers: 3,
      immutableOwner: "JayJayTeamDev",
      signing: "external",
      scope: "MAX approval plane; separate from proposed Worldz treasury profiles"
    }
  };
}

module.exports = {
  TIME_ZONE,
  ULTIMATE_PROVIDER_CAPABILITIES,
  ULTIMATE_SIGNERS,
  nextFundingWindow,
  ultimatePublicBlueprint
};
