import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@6.0.0";

const ALLOWED_ORIGIN = "https://launchpad.cryptoworldz.xyz";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin"
};
const TOKEN_PROGRAMS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
]);
const ENGINE_POOL_PROGRAMS: Record<string,string> = {
  flash: "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb",
  curve: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
  "curve-pro": "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN"
};
const FEE_FLOW_V2 = "WORLDZ-FEE-FLOW-V2";
const V2_FIXED_ROUTES: Record<string,number> = {
  creatorDeveloper: 10,
  launchReferrer: 15,
  legacyCore: 15,
  worldzCoreFamilyMarketBuys: 12,
  lpGrowth: 10,
  launchedTokenBuybackAndBurn: 8,
  impactCharity: 5,
  teamBuilderRewards: 5,
  futureTokenDeploymentReserve: 5
};
const V2_LAUNCHPAD_CHOICES = [3, 5, 8] as const;
const V2_TREASURY_BY_CHOICE: Record<number,number> = { 3: 12, 5: 10, 8: 7 };
const V2_ROUTE_KEYS = new Set([...Object.keys(V2_FIXED_ROUTES), "worldzLaunchPad", "treasuryReserve"]);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function rpcCall(method: string, params: unknown[], rpcUrl: string) {
  const rpc = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!rpc.ok) throw new Error("devnet_rpc_unavailable");
  const out = await rpc.json();
  if (out?.error) throw new Error("devnet_rpc_error");
  return out?.result;
}

async function verifyMint(mint: string, expectedDecimals: number, expectedSupply: string, rpcUrl: string) {
  const result = await rpcCall("getAccountInfo", [mint, { encoding: "jsonParsed", commitment: "confirmed" }], rpcUrl);
  const value = result?.value;
  if (!value) return { ok: false, reason: "mint_not_found_on_selected_network" };
  if (!TOKEN_PROGRAMS.has(String(value.owner || ""))) return { ok: false, reason: "account_is_not_a_supported_token_mint" };
  const info = value?.data?.parsed?.info;
  if (!info || typeof info !== "object") return { ok: false, reason: "mint_parse_failed" };
  const decimals = Number(info.decimals);
  const rawSupply = String(info.supply ?? "");
  const expectedRaw = (BigInt(expectedSupply) * (10n ** BigInt(expectedDecimals))).toString();
  if (decimals !== expectedDecimals) return { ok: false, reason: "mint_decimals_mismatch" };
  if (rawSupply !== expectedRaw) return { ok: false, reason: "mint_supply_mismatch" };
  return {
    ok: true,
    ownerProgram: value.owner,
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    rawSupply
  };
}

async function verifyPool(engine: string, poolId: string, rpcUrl: string) {
  const expectedOwner = ENGINE_POOL_PROGRAMS[engine];
  if (!expectedOwner) return { ok: false, reason: "engine_has_no_verified_pool_program" };
  const result = await rpcCall("getAccountInfo", [poolId, { encoding: "base64", commitment: "confirmed" }], rpcUrl);
  const value = result?.value;
  if (!value) return { ok: false, reason: "pool_not_found_on_selected_network" };
  if (String(value.owner || "") !== expectedOwner) return { ok: false, reason: "pool_program_owner_mismatch" };
  return { ok: true, ownerProgram: value.owner };
}

async function verifyTxSigner(signature: string, wallet: string, rpcUrl: string) {
  const tx = await rpcCall("getTransaction", [signature, {
    encoding: "jsonParsed",
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0
  }], rpcUrl);
  if (!tx) return { ok: false, reason: "transaction_not_found_on_selected_network" };
  if (tx?.meta?.err) return { ok: false, reason: "transaction_failed_on_chain" };
  const keys = tx?.transaction?.message?.accountKeys || [];
  const signed = keys.some((k: any) => {
    if (typeof k === "string") return k === wallet;
    return String(k?.pubkey || "") === wallet && k?.signer === true;
  });
  if (!signed) return { ok: false, reason: "wallet_not_transaction_signer" };
  return { ok: true, slot: tx.slot };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.headers.get("origin") && req.headers.get("origin") !== ALLOWED_ORIGIN) return json({ ok: false, error: "origin_not_allowed" }, 403);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("worldz_launch_registry")
      .select("id,environment,network,engine,quote_asset,mint,token_name,symbol,decimals,fixed_supply,project_fee_percent,fee_routes,pool_id,stage,proof,created_at,updated_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return json({ ok: false, error: "public_launch_list_failed" }, 500);
    const { data: gate } = await supabase.from("worldz_launch_platform_settings").select("public_mainnet_enabled,treasury_vault_address").eq("setting_key","public_launch").maybeSingle();
    const { data: founding, error: foundingError } = await supabase
      .from("worldz_founding_100")
      .select("candidate_order,founding_position,status,network,mint,token_name,symbol,team_label,worldz_allocation_percent,candidate_at,qualified_at")
      .order("candidate_order", { ascending: true })
      .limit(100);
    if (foundingError) return json({ ok: false, error: "founding_100_list_failed" }, 500);
    const foundingRows = founding ?? [];
    return json({
      ok: true,
      launches: data ?? [],
      standard: "WORLDZ-LAUNCH-REGISTER-V2",
      feeFlowVersion: FEE_FLOW_V2,
      worldzLaunchPadContributionChoicesPercent: [...V2_LAUNCHPAD_CHOICES],
      worldzLaunchPadContributionDefaultPercent: 5,
      fixedFeeDistributionPercent: V2_FIXED_ROUTES,
      treasuryReserveByLaunchPadChoice: { "3": 12, "5": 10, "8": 7 },
      legacyCore: { totalPercent: 15, tokenCount: 12, equalPercentEach: 1.25, closed: true },
      worldzCoreFamily: { totalPercent: 12, equalPercentEach: 3, symbols: ["WLDZ","RVIV","PNEX","MRCL"] },
      tokenSupplyTakePercent: 0,
      initialLiquidityTakePercent: 0,
      walletTransferTaxPercent: 0,
      legacyAdapter: {
        profileOnly: true,
        platformSharePercentOfCollectedTokenFee: 10,
        projectSharePercentOfCollectedTokenFee: 90
      },
      mainnetPublicLaunchEnabled: gate?.public_mainnet_enabled === true,
      treasuryMultisigReady: !!gate?.treasury_vault_address,
      founding100: {
        totalPositions: 100,
        futureWorldzPoolPercent: 10,
        equalAllocationPerQualifiedPositionPercent: 0.1,
        qualifiedCount: foundingRows.filter((x: any) => x.status === "qualified").length,
        pendingReviewCount: foundingRows.filter((x: any) => x.status === "pending_review").length,
        positions: foundingRows
      }
    });
  }

  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const {
    intent_hash, mint, wallet, issued_at, signature, environment, network, engine, quote_asset,
    token_name, symbol, decimals, fixed_supply, project_fee_percent, fee_flow_version,
    launchpad_contribution_percent, fee_routes, metadata,
    metadata_uri, mint_tx_signature, pool_id, lp_mint, pool_tx_signature, vesting_config,
    lock_config, proof, stage
  } = body ?? {};

  if (!/^[0-9a-f]{64}$/.test(String(intent_hash || ""))) return json({ ok: false, error: "invalid_intent_hash" }, 400);
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(String(mint || ""))) return json({ ok: false, error: "invalid_mint" }, 400);
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(String(wallet || ""))) return json({ ok: false, error: "invalid_wallet" }, 400);
  if (!["devnet","mainnet-beta"].includes(String(environment)) || network !== "solana") return json({ ok: false, error: "unsupported_public_registration_network" }, 400);
  if (!["flash","curve","curve-pro","liquidity","board"].includes(String(engine))) return json({ ok: false, error: "invalid_engine" }, 400);

  const isMainnet = environment === "mainnet-beta";
  const feeFlowVersion = String(fee_flow_version || "");
  const isV2 = feeFlowVersion === FEE_FLOW_V2;
  let mainnetGate: any = null;
  if (isMainnet) {
    const { data: gate, error: gateError } = await supabase
      .from("worldz_launch_platform_settings")
      .select("*")
      .eq("setting_key","public_launch")
      .maybeSingle();
    if (gateError || !gate) return json({ ok: false, error: "mainnet_gate_unavailable" }, 503);
    mainnetGate = gate;
    if (gate.public_mainnet_enabled !== true) return json({ ok: false, error: "public_mainnet_gate_closed" }, 403);
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(String(gate.treasury_vault_address || ""))) return json({ ok: false, error: "treasury_multisig_not_registered" }, 503);
    if (engine !== "curve-pro") return json({ ok: false, error: "mainnet_engine_not_enabled" }, 400);
    if (isV2) return json({ ok: false, error: "fee_flow_v2_mainnet_settlement_not_proven" }, 503);
    if (Number(gate.platform_fee_share_percent) !== 10 || Number(gate.project_fee_share_percent) !== 90) return json({ ok: false, error: "legacy_mainnet_fee_share_contract_mismatch" }, 500);
  }
  const rpcUrl = isMainnet ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com";
  if (!String(token_name || "").trim() || !/^[A-Za-z0-9_$.-]{2,20}$/.test(String(symbol || ""))) return json({ ok: false, error: "invalid_token_identity" }, 400);

  const d = Number(decimals);
  if (!Number.isInteger(d) || d < 0 || d > 9) return json({ ok: false, error: "invalid_decimals" }, 400);
  if (!/^\d+$/.test(String(fixed_supply || "")) || BigInt(String(fixed_supply)) < 1000n || BigInt(String(fixed_supply)) > 1000000000000n) return json({ ok: false, error: "invalid_supply" }, 400);
  const fee = Number(project_fee_percent);
  if (!Number.isFinite(fee) || fee < 0.5 || fee > 3) return json({ ok: false, error: "project_fee_outside_worldz_range" }, 400);

  const issued = Date.parse(String(issued_at || ""));
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 5 * 60 * 1000) return json({ ok: false, error: "signature_timestamp_expired" }, 400);

  const message = [
    "WORLDZLAUNCHPAD_REGISTER_V1",
    "intent_hash=" + intent_hash,
    "mint=" + mint,
    "wallet=" + wallet,
    "issued_at=" + issued_at
  ].join("\n");

  try {
    const valid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(String(signature || "")),
      bs58.decode(String(wallet))
    );
    if (!valid) return json({ ok: false, error: "invalid_wallet_signature" }, 401);
  } catch {
    return json({ ok: false, error: "invalid_wallet_signature_encoding" }, 401);
  }

  const routes = fee_routes || {};
  const routeValues = Object.values(routes).map(Number);
  if (!routeValues.every((v: number) => Number.isFinite(v) && v >= 0 && v <= 100)) return json({ ok: false, error: "invalid_fee_route_value" }, 400);
  const routeTotal = routeValues.reduce((a: number, b: number) => a + b, 0);
  if (Math.abs(routeTotal - 100) > 0.001) return json({ ok: false, error: "fee_routes_must_total_100" }, 400);

  let launchPadContribution: number | null = null;
  if (isV2) {
    const keys = Object.keys(routes);
    if (keys.length !== V2_ROUTE_KEYS.size || keys.some((key) => !V2_ROUTE_KEYS.has(key))) {
      return json({ ok: false, error: "fee_flow_v2_route_keys_mismatch" }, 400);
    }
    for (const [key, expected] of Object.entries(V2_FIXED_ROUTES)) {
      if (Number(routes[key]) !== expected) return json({ ok: false, error: "fee_flow_v2_fixed_route_drift", route: key, expected }, 400);
    }
    launchPadContribution = Number(routes.worldzLaunchPad);
    if (!V2_LAUNCHPAD_CHOICES.includes(launchPadContribution as 3|5|8)) {
      return json({ ok: false, error: "fee_flow_v2_launchpad_choice_invalid" }, 400);
    }
    if (Number(launchpad_contribution_percent) !== launchPadContribution) {
      return json({ ok: false, error: "fee_flow_v2_launchpad_choice_snapshot_mismatch" }, 400);
    }
    if (Number(routes.treasuryReserve) !== V2_TREASURY_BY_CHOICE[launchPadContribution]) {
      return json({ ok: false, error: "fee_flow_v2_treasury_balance_mismatch" }, 400);
    }
    if ((engine === "curve" || engine === "curve-pro") && environment === "devnet") {
      if (proof?.feeFlowV2OnchainSettlement === true) {
        return json({ ok: false, error: "devnet_adapter_cannot_claim_fee_flow_v2_onchain_settlement" }, 400);
      }
    }
  } else if (engine === "curve" || engine === "curve-pro") {
    if (Number(routes.worldz ?? -1) !== 10 || Number(routes.project ?? -1) !== 90) return json({ ok: false, error: "legacy_curve_fee_split_must_be_project_90_worldz_10" }, 400);
    const extraKeys = Object.keys(routes).filter((k) => !["project","worldz"].includes(k) && Number(routes[k] ?? 0) !== 0);
    if (extraKeys.length) return json({ ok: false, error: "legacy_curve_fee_split_contains_extra_routes" }, 400);
  } else {
    const creatorRoute = Number(routes.creator ?? 0);
    const treasuryRoute = Number(routes.treasury ?? 0);
    const lpRoute = Number(routes.lp ?? 0);
    const publicBenefit = Number(routes.holders ?? 0) + lpRoute + Number(routes.community ?? 0);
    if (creatorRoute > 20) return json({ ok: false, error: "legacy_creator_fee_route_above_20_percent" }, 400);
    if (treasuryRoute > 20) return json({ ok: false, error: "legacy_treasury_fee_route_above_20_percent" }, 400);
    if (lpRoute < 20) return json({ ok: false, error: "legacy_lp_growth_fee_route_below_20_percent" }, 400);
    if (publicBenefit < 60) return json({ ok: false, error: "legacy_public_benefit_fee_routes_below_60_percent" }, 400);
  }
  const { data: existing, error: findError } = await supabase
    .from("worldz_launch_registry")
    .select("id,wallet_address")
    .eq("mint", mint)
    .maybeSingle();
  if (findError) return json({ ok: false, error: "registry_lookup_failed" }, 500);
  if (existing && existing.wallet_address !== wallet) return json({ ok: false, error: "mint_already_registered_to_another_wallet" }, 409);

  let mintCheck: any;
  try { mintCheck = await verifyMint(String(mint), d, String(fixed_supply), rpcUrl); }
  catch (e) { return json({ ok: false, error: e instanceof Error ? e.message : "mint_verification_failed" }, 502); }
  if (!mintCheck.ok) return json({ ok: false, error: mintCheck.reason }, 400);
  if (mintCheck.freezeAuthority !== null) return json({ ok: false, error: "worldz_registry_requires_no_freeze_authority" }, 400);

  let poolCheck: any = null;
  let txCheck: any = null;
  if (engine === "flash") {
    if (!existing && mintCheck.mintAuthority !== wallet) {
      return json({ ok: false, error: "first_flash_registration_requires_wallet_to_be_current_mint_authority" }, 403);
    }
    if (pool_id && pool_tx_signature) {
      try {
        poolCheck = await verifyPool(engine, String(pool_id), rpcUrl);
        txCheck = await verifyTxSigner(String(pool_tx_signature), String(wallet), rpcUrl);
      } catch (e) { return json({ ok: false, error: e instanceof Error ? e.message : "flash_pool_verification_failed" }, 502); }
      if (!poolCheck.ok) return json({ ok: false, error: poolCheck.reason }, 400);
      if (!txCheck.ok) return json({ ok: false, error: txCheck.reason }, 400);
    }
  } else if (engine === "curve" || engine === "curve-pro") {
    if (!pool_id || !pool_tx_signature) return json({ ok: false, error: "curve_registration_requires_pool_and_transaction_proof" }, 400);
    try {
      poolCheck = await verifyPool(engine, String(pool_id), rpcUrl);
      txCheck = await verifyTxSigner(String(pool_tx_signature), String(wallet), rpcUrl);
    } catch (e) { return json({ ok: false, error: e instanceof Error ? e.message : "curve_pool_verification_failed" }, 502); }
    if (!poolCheck.ok) return json({ ok: false, error: poolCheck.reason }, 400);
    if (!txCheck.ok) return json({ ok: false, error: txCheck.reason }, 400);
  }

  const safeStage = ["token_created","metadata_created","pool_created","locked","vested","proof_complete","registered"].includes(String(stage))
    ? String(stage) : "registered";

  const record = {
    intent_hash, environment, network, engine, quote_asset: String(quote_asset || "SOL"),
    wallet_address: wallet, mint, token_name: String(token_name).slice(0,64), symbol: String(symbol).slice(0,20),
    decimals: d, fixed_supply: String(fixed_supply), project_fee_percent: fee,
    fee_routes: fee_routes || {}, metadata: metadata || {}, metadata_uri: metadata_uri || null,
    mint_tx_signature: mint_tx_signature || null, pool_id: pool_id || null, lp_mint: lp_mint || null,
    pool_tx_signature: pool_tx_signature || null, vesting_config: vesting_config || {}, lock_config: lock_config || {},
    proof: {
      ...(proof || {}),
      walletSignatureVerified: true,
      selectedNetworkMintVerified: true,
      environmentVerified: environment,
      tokenProgram: mintCheck.ownerProgram,
      onChainSupplyVerified: true,
      onChainDecimalsVerified: true,
      freezeAuthorityNone: true,
      currentMintAuthority: mintCheck.mintAuthority,
      poolProgramVerified: !!poolCheck?.ok,
      poolProgram: poolCheck?.ownerProgram ?? null,
      launchTransactionSignerVerified: !!txCheck?.ok,
      launchTransactionSlot: txCheck?.slot ?? null,
      feeFlowVersion: isV2 ? FEE_FLOW_V2 : "LEGACY-ADAPTER",
      worldzLaunchPadContributionPercent: isV2 ? launchPadContribution : null,
      feeFlowV2LedgerSnapshot: isV2,
      feeFlowV2OnchainSettlement: false,
      legacyAdapterProfileOnly: !isV2,
      worldzPlatformSharePercentOfCollectedTokenFee: isV2 ? null : 10,
      worldzPlatformShareOfTokenSupplyPercent: 0,
      worldzPlatformShareOfInitialLiquidityPercent: 0,
      walletTransferTaxPercent: 0,
      safeLaunchServerPolicyVersion: isV2 ? "WORLDZ-PUBLIC-LAUNCH-3-V2" : "WORLDZ-PUBLIC-LAUNCH-2",
      mainnetGateVerified: isMainnet ? true : false,
      treasuryMultisigFeeClaimer: isMainnet ? mainnetGate?.treasury_vault_address : null
    },
    stage: safeStage, zed_registered: true, auto_registered: true, grace_registered: true,
    is_public: true, updated_at: new Date().toISOString()
  };

  const op = existing
    ? supabase.from("worldz_launch_registry").update(record).eq("id", existing.id).select("id,intent_hash,mint,stage,zed_registered,auto_registered,grace_registered").single()
    : supabase.from("worldz_launch_registry").insert(record).select("id,intent_hash,mint,stage,zed_registered,auto_registered,grace_registered").single();

  const { data, error } = await op;
  if (error) return json({ ok: false, error: "registry_write_failed", detail: error.message }, 500);

  return json({ ok: true, registry: data, commandCentre: { zed: "shared_registry", auto: "shared_registry", grace: "shared_registry" } });
});