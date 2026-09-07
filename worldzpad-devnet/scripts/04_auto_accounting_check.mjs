const ROUTES = {
  board: 10n,
  holderRewards: 40n,
  lpGrowth: 20n,
  buybackBurn: 15n,
  charity: 10n,
  raaiiiddGrowth: 5n,
};

function splitByPercent(total, routes) {
  const entries = Object.entries(routes);
  const out = {};
  let used = 0n;
  for (let i = 0; i < entries.length; i++) {
    const [name, pct] = entries[i];
    const value = i === entries.length - 1 ? total - used : (total * pct) / 100n;
    out[name] = value;
    used += value;
  }
  if (used !== total) throw new Error(`route reconciliation failed ${used} != ${total}`);
  return out;
}

function integerSqrt(n) {
  if (n < 0n) throw new Error('sqrt negative');
  if (n < 2n) return n;
  let x0 = n;
  let x1 = (x0 + n / x0) >> 1n;
  while (x1 < x0) { x0 = x1; x1 = (x0 + n / x0) >> 1n; }
  return x0;
}

function allocateWeighted(total, weights) {
  const valid = Object.entries(weights).filter(([, w]) => w > 0n);
  const denom = valid.reduce((s, [, w]) => s + w, 0n);
  if (!denom) return {};
  const out = {};
  let used = 0n;
  valid.forEach(([id, w], idx) => {
    const amount = idx === valid.length - 1 ? total - used : (total * w) / denom;
    out[id] = amount;
    used += amount;
  });
  if (used !== total) throw new Error('weighted allocation did not reconcile');
  return out;
}

// 1 SOL of actual NET Worldz-side claimable fee revenue, represented in lamports.
const netFeeLamports = 1_000_000_000n;
const routes = splitByPercent(netFeeLamports, ROUTES);
if (routes.board !== 100_000_000n || routes.holderRewards !== 400_000_000n || routes.lpGrowth !== 200_000_000n || routes.buybackBurn !== 150_000_000n || routes.charity !== 100_000_000n || routes.raaiiiddGrowth !== 50_000_000n) throw new Error('AUTO route values incorrect');

const holderPool = routes.holderRewards;
const proportionalPool = holderPool * 70n / 100n;
const equalizerPool = holderPool - proportionalPool;
if (proportionalPool !== 280_000_000n || equalizerPool !== 120_000_000n) throw new Error('70/30 holder pool incorrect');

// Sample eligible circulating balances. System/locked balances never enter this map.
const eligible = {
  smallHolder: 10_000n,
  mediumHolder: 100_000n,
  largeHolder: 1_000_000n,
};
const proportional = allocateWeighted(proportionalPool, eligible);
const equalizerWeights = Object.fromEntries(Object.entries(eligible).map(([id, balance]) => [id, integerSqrt(balance)]));
const equalizer = allocateWeighted(equalizerPool, equalizerWeights);
const rewards = Object.fromEntries(Object.keys(eligible).map((id) => [id, proportional[id] + equalizer[id]]));
const rewardTotal = Object.values(rewards).reduce((a, b) => a + b, 0n);
if (rewardTotal !== holderPool) throw new Error('holder reward reconciliation failed');
if (!(rewards.largeHolder > rewards.mediumHolder && rewards.mediumHolder > rewards.smallHolder)) throw new Error('larger holders must still earn more in absolute rewards');

const perTokenScaled = Object.fromEntries(Object.entries(rewards).map(([id, reward]) => [id, reward * 1_000_000n / eligible[id]]));
if (!(perTokenScaled.smallHolder > perTokenScaled.mediumHolder && perTokenScaled.mediumHolder > perTokenScaled.largeHolder)) throw new Error('Equalizer must improve reward per token for smaller eligible holders');

console.log('AUTO_ACCOUNTING=PASS net_fee=1SOL routes=10/40/20/15/10/5 holder=70/30 reconciled=1 equalizer=sqrt smaller_per_token_boost=1');
