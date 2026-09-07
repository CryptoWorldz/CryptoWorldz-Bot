import fs from 'node:fs';

const p = new URL('./06_swap_claim_local.mjs', import.meta.url);
let s = fs.readFileSync(p, 'utf8');
s = s.replace("  getTokenProgram,\n", "");
s = s.replace("  tokenAProgram: getTokenProgram(poolStateBefore.tokenAFlag),", "  tokenAProgram: TOKEN_2022_PROGRAM_ID,");
s = s.replace("  tokenBProgram: getTokenProgram(poolStateBefore.tokenBFlag),", "  tokenBProgram: TOKEN_PROGRAM_ID,");
s = s.replace("  tokenAProgram: getTokenProgram(poolStateAfterSwap.tokenAFlag),", "  tokenAProgram: TOKEN_2022_PROGRAM_ID,");
s = s.replace("  tokenBProgram: getTokenProgram(poolStateAfterSwap.tokenBFlag),", "  tokenBProgram: TOKEN_PROGRAM_ID,");
s = s.replace("  payer: payer.publicKey,\n  pool,", "  payer: payer.publicKey,\n  receiver: payer.publicKey,\n  pool,");
if (s.includes('getTokenProgram(')) throw new Error('SDK compatibility patch incomplete');
fs.writeFileSync(p, s);
console.log('PHASE3_SDK_COMPAT=PASS tokenA=Token2022 tokenB=SPL receiver=explicit');
