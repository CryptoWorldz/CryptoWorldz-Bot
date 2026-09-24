import fs from 'node:fs';
import path from 'node:path';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, DammV2BaseFeeMode,
  DammV2DynamicFeeMode, MigratedCollectFeeMode, MigrationFeeOption,
  MigrationOption, TokenAuthorityOption, TokenDecimal, TokenType, buildCurve
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { MAGIC, deriveLegacyVaults, staticRouterProgramId, staticRouterAuthority } from './common.mjs';

const curve=buildCurve({
  token:{
    tokenType:TokenType.SPLToken,
    tokenBaseDecimal:TokenDecimal.SIX,
    tokenQuoteDecimal:TokenDecimal.NINE,
    tokenAuthorityOption:TokenAuthorityOption.Immutable,
    totalTokenSupply:200_000_000,
    leftover:0
  },
  fee:{
    baseFeeParams:{
      baseFeeMode:BaseFeeMode.FeeSchedulerLinear,
      feeSchedulerParam:{startingFeeBps:75,endingFeeBps:75,numberOfPeriod:0,totalDuration:0}
    },
    dynamicFeeEnabled:false,
    collectFeeMode:CollectFeeMode.QuoteToken,
    creatorTradingFeePercentage:51,
    poolCreationFee:0,
    enableFirstSwapWithMinFee:false
  },
  migration:{
    migrationOption:MigrationOption.MET_DAMM_V2,
    migrationFeeOption:MigrationFeeOption.Customizable,
    migrationFee:{feePercentage:0,creatorFeePercentage:51},
    migratedPoolFee:{
      collectFeeMode:MigratedCollectFeeMode.QuoteToken,
      dynamicFee:DammV2DynamicFeeMode.Disabled,
      poolFeeBps:75,
      baseFeeMode:DammV2BaseFeeMode.FeeTimeSchedulerLinear
    }
  },
  liquidityDistribution:{
    partnerLiquidityPercentage:0,
    partnerPermanentLockedLiquidityPercentage:40,
    creatorLiquidityPercentage:0,
    creatorPermanentLockedLiquidityPercentage:60
  },
  lockedVesting:{
    totalLockedVestingAmount:0,
    numberOfVestingPeriod:0,
    cliffUnlockAmount:0,
    totalVestingDuration:0,
    cliffDurationFromMigrationTime:0
  },
  activationType:ActivationType.Timestamp,
  percentageSupplyOnMigration:15,
  migrationQuoteThreshold:1
});

if(MAGIC.creatorControlledPercent+MAGIC.partnerControlledPercent!==100)throw new Error('51/49 != 100');
if(Object.values(MAGIC.routes).reduce((a,b)=>a+b,0)!==49)throw new Error('partner routes != 49');
if(Object.values(MAGIC.routerWeights).slice(0,4).reduce((a,b)=>a+b,0)!==MAGIC.routerWeights.total)throw new Error('router weights bad');
if(MAGIC.permanentLock.creator+MAGIC.permanentLock.partner!==100)throw new Error('permanent lock != 100');
const vaults=deriveLegacyVaults();
if(vaults.length!==10||new Set(vaults.map(v=>v.pda)).size!==10)throw new Error('legacy PDA derivation failed');

fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(path.join('artifacts','revive-static-proof.json'),JSON.stringify({
  proof:'REVIVE_MAGICFEE_STATIC',
  sdk:'@meteora-ag/dynamic-bonding-curve-sdk@1.5.12',
  magicFee:MAGIC,
  routerStaticFixture:{
    programId:staticRouterProgramId().toBase58(),
    authority:staticRouterAuthority().toBase58(),
    seedContract:'legacy-vault + authority + legacy_mint',
    vaultPdas:vaults,
    deployStatus:'NOT_DEPLOYED',
  },
  curveBuildAccepted:true,
  mainnetExecution:false
},null,2)+'\n');

console.log('REVIVE_STATIC_PROOF=PASS fee_bps=75 creator=51 partner=49 routes=17/15/8.5/8.5 legacy_pdas=10 lp_lock=100 dynamic_fee=OFF');
