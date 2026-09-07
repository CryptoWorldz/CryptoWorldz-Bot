import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve('scripts/07_final_pre_mainnet_local.mjs');
let text = fs.readFileSync(target, 'utf8');

const beforeOld = 'positionLiquidityBefore: positionBeforeLp.liquidity.toString(),';
const afterOld = 'positionLiquidityAfter: positionAfterLp.liquidity.toString(),';
const beforeNew = 'positionLiquidityBefore: positionBeforeLp.vestedLiquidity.add(positionBeforeLp.permanentLockedLiquidity).add(positionBeforeLp.unlockedLiquidity).toString(),';
const afterNew = 'positionLiquidityAfter: positionAfterLp.vestedLiquidity.add(positionAfterLp.permanentLockedLiquidity).add(positionAfterLp.unlockedLiquidity).toString(),';

if (!text.includes(beforeOld) || !text.includes(afterOld)) {
  throw new Error('Final-test liquidity report anchors changed; refusing an unverified patch');
}
text = text.replace(beforeOld, beforeNew).replace(afterOld, afterNew);
fs.writeFileSync(target, text);

console.log('FINAL_POSITION_LIQUIDITY_COMPAT=PASS shape=vested+permanentLocked+unlocked');
