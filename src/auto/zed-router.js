const { createRequestLimiter, validateTelegramInitData } = require("../miniapp-auth");
const {
  ULTIMATE_PROVIDER_CAPABILITIES,
  ULTIMATE_SIGNERS,
  nextFundingWindow,
  ultimatePublicBlueprint
} = require("./ultimate-blueprint");

function decimalToRawAmount(value, decimals) {
  const input = String(value ?? "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(input)) throw Object.assign(new Error("invalid_decimal_amount"), { code: "invalid_decimal_amount" });
  const places = Number(decimals);
  if (!Number.isInteger(places) || places < 0 || places > 18) throw Object.assign(new Error("invalid_token_decimals"), { code: "invalid_token_decimals" });
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > places) throw Object.assign(new Error("too_many_decimal_places"), { code: "too_many_decimal_places" });
  const base = 10n ** BigInt(places);
  const fractional = places === 0 ? 0n : BigInt((fraction + "0".repeat(places)).slice(0, places) || "0");
  const raw = (BigInt(whole) * base) + fractional;
  if (raw <= 0n) throw Object.assign(new Error("amount_too_small"), { code: "amount_too_small" });
  return raw.toString();
}

function registerAutoMiniRoutes({ app, config, autoClient, supabase }) {
  const allowRequest = createRequestLimiter({ maxEvents: 30, intervalMs: 60000 });
  const allowPublicQuote = createRequestLimiter({ maxEvents: 1, intervalMs: 2500 });

  const miniInitDataMaxAgeSeconds = Math.min(
    86400,
    Math.max(300, Number(process.env.MINIAPP_INIT_DATA_MAX_AGE_SECONDS) || 86400)
  );

  async function authenticateAuto(req, res, next) {
    const result = validateTelegramInitData(
      req.get("x-telegram-init-data") || "",
      config.botToken,
      { maxAgeSeconds: miniInitDataMaxAgeSeconds }
    );
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    const owner = String(result.user.id) === String(config.ownerTelegramId);
    let executive = false;
    if (!owner && supabase) {
      const { data, error } = await supabase
        .from("executive_admins")
        .select("status")
        .eq("telegram_id", result.user.id)
        .maybeSingle();
      if (error && error.code !== "42P01") return res.status(500).json({ ok: false, error: "executive_access_failed" });
      executive = Boolean(data && data.status === "active");
    }
    if (!owner && !executive) return res.status(403).json({ ok: false, error: "executive_required" });
    if (!allowRequest(`${result.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    if (!autoClient.configured()) return res.status(503).json({ ok: false, error: "auto_not_configured" });
    req.telegramUser = result.user;
    req.autoAuthority = { owner, executive };
    return next();
  }

  function ownerOnly(req, res, next) {
    if (!req.autoAuthority?.owner) return res.status(403).json({ ok: false, error: "owner_required" });
    return next();
  }

  function authenticatePublicAuto(req, res, next) {
    const result = validateTelegramInitData(
      req.get("x-telegram-init-data") || "",
      config.botToken,
      { maxAgeSeconds: miniInitDataMaxAgeSeconds }
    );
    if (!result.ok) return res.status(401).json({ ok: false, error: result.error });
    if (!allowRequest(`public:${result.user.id}:${req.ip}`)) return res.status(429).json({ ok: false, error: "rate_limited" });
    req.telegramUser = result.user;
    return next();
  }

  function publicPlannerPayload() {
    return {
      ok: true,
      name: "AUTO Market Planner™",
      access: "ALL_SIGNED_WORLDZ_USERS",
      availability: "EVERY_DAY",
      defaultFundingSource: "USER_PERSONAL_WALLET",
      treasuryRequired: false,
      treasuryExecutionIsSeparate: true,
      executionEnabled: false,
      walletCustody: false,
      privateKeysStored: false,
      modes: ["BUY_ANALYSIS", "LP_ANALYSIS", "HYBRID_ANALYSIS"],
      buyQuoteProvider: "JUPITER_ULTRA_V3",
      lpQuoteState: "FAIL_CLOSED_UNTIL_LIVE_METEORA_ADAPTER",
      realizableValueGate: {
        enabled: true,
        exitQuoteProvider: "JUPITER_ULTRA_V3",
        defaultExitAsset: "USDC",
        rule: "Displayed market cap and mark-to-market position value are not liquid capital. AUTO requires a live exit quote before treating a token holding as realizable value."
      },
      liveRules: [
        "Use the user's own selected wallet and budget by default.",
        "Show live route, price impact, fees, liquidity evidence and expected output before any signature.",
        "Never assume Treasury funding.",
        "Never claim LP or hybrid optimisation until the live Meteora pool adapter has supplied a verified quote.",
        "No wash trading, fake volume, wallet rotation or hidden execution."
      ]
    };
  }

  function proxyError(res, error, fallback, validationStatus = 502) {
    const payload = error.payload || { ok: false, error: error.code || fallback };
    const status = error.payload ? validationStatus : 502;
    return res.status(status).json(payload);
  }

  async function ultimateStatusPayload() {
    const blueprint = ultimatePublicBlueprint();
    const nextFunding = nextFundingWindow(new Date());
    const providers = Object.fromEntries(Object.entries(ULTIMATE_PROVIDER_CAPABILITIES).map(([name, provider]) => [name, {
      role: provider.role,
      mode: provider.mode,
      external_authorization_required: provider.canAutoAuthorize === false,
      secret_custody: provider.canHoldSecrets ? "provider" : "prohibited"
    }]));
    const launchPolicy = {
      platform: {
        name: "WorldzLaunchPad™",
        url: "https://launchpad.cryptoworldz.xyz/",
        launchStationUrl: "https://launchpad.cryptoworldz.xyz/launch-station/",
        communityUrl: "https://launchpad.cryptoworldz.xyz/community/",
        integrationsUrl: "https://launchpad.cryptoworldz.xyz/integrations/",
        readinessUrl: "https://launchpad.cryptoworldz.xyz/ready/",
        omnichainUrl: "https://launchpad.cryptoworldz.xyz/omnichain/",
        status: "PUBLIC_PRODUCT_READY__MAINNET_MARKET_EXECUTION_GATED"
      },
      engines: [
        { id: "mint", name: "WorldzMINT™", url: "https://launchpad.cryptoworldz.xyz/mint/" },
        { id: "existing-mint", name: "Existing Mint Intake", url: "https://launchpad.cryptoworldz.xyz/launch-station/?mode=existing" },
        { id: "flash", name: "Worldz Flash™", url: "https://launchpad.cryptoworldz.xyz/devnet/" },
        { id: "curve", name: "Worldz Curve™", url: "https://launchpad.cryptoworldz.xyz/curve/" },
        { id: "curve-pro", name: "Worldz Curve Pro™", url: "https://launchpad.cryptoworldz.xyz/curve-pro/" }
      ],
      feePolicy: {
        version: "WORLDZ-FEE-FLOW-V3",
        projectTradingFeeDefaultPercent: 1,
        projectTradingFeeMaxPercent: 3,
        preferredIncrementPercent: 0.25,
        dynamicFeeDefault: false,
        launchPadContributionChoicesPercent: [3, 5, 8],
        launchPadContributionDefaultPercent: 5,
        creatorRetentionByContributionPercent: { "3": 97, "5": 95, "8": 92 },
        worldzInternalSplitPercent: {
          operationsProductDevelopment: 20,
          treasury: 20,
          lpGrowth: 15,
          legacyCore: 10,
          worldzCoreFamilyMarketBuys: 10,
          impactCharity: 10,
          teamBuilderRewards: 5,
          futureLaunchInfrastructure: 5,
          launchReferrer: 5
        },
        treasuryLane: {
          percentOfWorldzContribution: 20,
          operationsPercent: 50,
          miracleTeamPercent: 30,
          purpleDiamondCrewPercent: 20,
          operationsGovernance: "3-of-5",
          miracleTeamGovernance: "4-of-7",
          purpleDiamondCrewGovernance: "MULTISIG_REQUIRED"
        },
        legacyTokenCount: 12,
        coreFamilySymbols: ["WLDZ", "RVIV", "PNEX", "MRCL"],
        legacyAdapterProfileOnly: true,
        externalVenueAndNetworkFeesSeparate: true,
        automaticMainnetRoutingEnabled: false
      },
      community: {
        commandCentre: true,
        dipshit: true,
        telegram: true,
        xOfficialApiRail: true,
        pumpSquadExternalRail: "TheChaos"
      },
      publicMainnetCreatorLaunchesEnabled: false
    };
    return {
      ok: true,
      ultimate: {
        ...blueprint,
        nextFunding,
        signers: ULTIMATE_SIGNERS.map(({ handle, role, immutable }) => ({ handle, role, immutable })),
        providers,
        launch: {
          concept: "WORLDZ",
          ticker: "$WLDZ",
          status: "candidate-mainnet-disabled"
        },
        launchPolicy,
        publicUrl: "https://launchpad.cryptoworldz.xyz/"
      }
    };
  }

  app.get("/api/mini/auto/public", authenticatePublicAuto, async (req, res) => {
    return res.json(publicPlannerPayload());
  });

  app.post("/api/mini/auto/public/simulate", authenticatePublicAuto, async (req, res) => {
    try {
      if (!autoClient.configured()) return res.status(503).json({ ok: false, error: "auto_not_configured" });
      const body = req.body || {};
      const fundingSource = String(body.funding_source || "USER_PERSONAL_WALLET").toUpperCase();
      const allowedFundingSources = new Set(["USER_PERSONAL_WALLET", "JAYJAYTEAMDEV_PERSONAL", "AUTHORIZED_MULTISIG"]);
      if (!allowedFundingSources.has(fundingSource)) {
        return res.status(400).json({ ok: false, error: "invalid_funding_source" });
      }
      const result = await autoClient.simulate({
        ...body,
        funding_source: fundingSource,
        requested_by: String(req.telegramUser.id),
        execution_requested: false
      });
      return res.json({
        ...result,
        publicPlanner: {
          fundingSource,
          treasuryRequired: false,
          executionEnabled: false,
          walletSignatureRequiredForAnyFutureExecution: true,
          note: "Planning only. This route cannot move funds or sign a transaction."
        }
      });
    } catch (error) {
      return proxyError(res, error, "auto_public_simulation_failed", 400);
    }
  });

  app.get("/api/mini/auto/public/quote", authenticatePublicAuto, async (req, res) => {
    if (!allowPublicQuote("jupiter-public-quote")) {
      return res.status(429).json({ ok: false, error: "quote_rate_limited", retry: "Try again in a few seconds." });
    }
    const tokenMint = String(req.query.token_mint || "").trim();
    const walletAddress = String(req.query.wallet_address || "").trim();
    const currency = String(req.query.currency || "SOL").toUpperCase();
    const amount = Number(req.query.amount);
    const keyPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!keyPattern.test(tokenMint)) return res.status(400).json({ ok: false, error: "invalid_token_mint" });
    if (!keyPattern.test(walletAddress)) return res.status(400).json({ ok: false, error: "invalid_wallet_address" });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return res.status(400).json({ ok: false, error: "invalid_amount" });
    const inputMint = currency === "SOL"
      ? "So11111111111111111111111111111111111111112"
      : currency === "USDC"
        ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        : null;
    if (!inputMint) return res.status(400).json({ ok: false, error: "unsupported_currency", allowed: ["SOL", "USDC"] });
    const rawAmount = currency === "SOL" ? Math.floor(amount * 1e9) : Math.floor(amount * 1e6);
    if (!Number.isSafeInteger(rawAmount) || rawAmount < 1) return res.status(400).json({ ok: false, error: "amount_too_small_or_large" });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint: tokenMint,
        amount: String(rawAmount),
        taker: walletAddress
      });
      const headers = { "accept": "application/json" };
      const hasJupiterKey = Boolean(process.env.JUPITER_API_KEY);
      if (hasJupiterKey) headers["x-api-key"] = process.env.JUPITER_API_KEY;
      const jupiterBase = hasJupiterKey ? "https://api.jup.ag" : "https://lite-api.jup.ag";
      const [quoteResponse, intelligenceResponse] = await Promise.all([
        fetch(jupiterBase + "/ultra/v1/order?" + params.toString(), { headers, signal: controller.signal }),
        fetch("https://launchpad.cryptoworldz.xyz/intelligence.php?mint=" + encodeURIComponent(tokenMint), {
          headers: { "accept": "application/json", "user-agent": "Worldz-AUTO-Public/1.0" },
          signal: controller.signal
        }).catch(() => null)
      ]);
      const quote = await quoteResponse.json().catch(() => ({}));
      const intelligence = intelligenceResponse && intelligenceResponse.ok
        ? await intelligenceResponse.json().catch(() => null)
        : null;
      if (!quoteResponse.ok || quote.errorCode || quote.error) {
        return res.status(422).json({
          ok: false,
          error: quote.errorMessage || quote.error || quote.errorCode || "no_executable_quote",
          provider: "Jupiter Ultra V3",
          intelligence
        });
      }
      const sanitizedQuote = {
        requestId: quote.requestId ?? null,
        inputMint: quote.inputMint ?? inputMint,
        outputMint: quote.outputMint ?? tokenMint,
        inAmount: quote.inAmount ?? String(rawAmount),
        outAmount: quote.outAmount ?? null,
        priceImpactPct: quote.priceImpactPct ?? null,
        swapType: quote.swapType ?? null,
        router: quote.router ?? null,
        slippageBps: quote.slippageBps ?? null,
        feeBps: quote.feeBps ?? null,
        gasless: quote.gasless ?? null,
        totalTime: quote.totalTime ?? null
      };
      return res.json({
        ok: true,
        checkedAt: new Date().toISOString(),
        mode: "READ_ONLY_QUOTE",
        fundingSource: String(req.query.funding_source || "USER_PERSONAL_WALLET").toUpperCase(),
        treasuryRequired: false,
        provider: "Jupiter Ultra V3",
        quote: sanitizedQuote,
        intelligence,
        executionEnabled: false,
        note: "Live quote snapshot only. Prices and routes can change before a wallet signs. No transaction was submitted."
      });
    } catch (error) {
      return res.status(error.name === "AbortError" ? 504 : 502).json({
        ok: false,
        error: error.name === "AbortError" ? "quote_timeout" : "quote_provider_unavailable"
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get("/api/mini/auto/public/exit-quote", authenticatePublicAuto, async (req, res) => {
    if (!allowPublicQuote(`jupiter-public-exit:${req.telegramUser.id}`)) {
      return res.status(429).json({ ok: false, error: "quote_rate_limited", retry: "Try again in a few seconds." });
    }

    const tokenMint = String(req.query.token_mint || "").trim();
    const walletAddress = String(req.query.wallet_address || "").trim();
    const tokenAmount = String(req.query.token_amount || "").trim();
    const outputCurrency = String(req.query.output_currency || "USDC").toUpperCase();
    const maxPriceImpactPct = Number(req.query.max_price_impact_pct ?? 1);
    const keyPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (!keyPattern.test(tokenMint)) return res.status(400).json({ ok: false, error: "invalid_token_mint" });
    if (!keyPattern.test(walletAddress)) return res.status(400).json({ ok: false, error: "invalid_wallet_address" });
    if (!/^\d+(?:\.\d+)?$/.test(tokenAmount)) return res.status(400).json({ ok: false, error: "invalid_token_amount" });
    if (!Number.isFinite(maxPriceImpactPct) || maxPriceImpactPct <= 0 || maxPriceImpactPct > 50) {
      return res.status(400).json({ ok: false, error: "invalid_max_price_impact_pct" });
    }

    const outputMint = outputCurrency === "USDC"
      ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      : outputCurrency === "SOL"
        ? "So11111111111111111111111111111111111111112"
        : null;
    const outputDecimals = outputCurrency === "USDC" ? 6 : outputCurrency === "SOL" ? 9 : null;
    if (!outputMint) return res.status(400).json({ ok: false, error: "unsupported_output_currency", allowed: ["USDC", "SOL"] });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const intelligenceResponse = await fetch(
        "https://launchpad.cryptoworldz.xyz/intelligence.php?mint=" + encodeURIComponent(tokenMint),
        {
          headers: { "accept": "application/json", "user-agent": "Worldz-AUTO-Exitability/1.0" },
          signal: controller.signal
        }
      );
      const intelligence = intelligenceResponse.ok
        ? await intelligenceResponse.json().catch(() => null)
        : null;
      const tokenDecimals = Number(intelligence?.onchain?.decimals);
      if (!Number.isInteger(tokenDecimals)) {
        return res.status(422).json({
          ok: false,
          error: "token_decimals_unverified",
          capitalRule: "Displayed market cap or position value is not liquid capital without a verified executable exit quote."
        });
      }

      let rawAmount;
      try {
        rawAmount = decimalToRawAmount(tokenAmount, tokenDecimals);
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.code || "invalid_token_amount" });
      }

      const params = new URLSearchParams({
        inputMint: tokenMint,
        outputMint,
        amount: rawAmount,
        taker: walletAddress
      });
      const headers = { "accept": "application/json" };
      const hasJupiterKey = Boolean(process.env.JUPITER_API_KEY);
      if (hasJupiterKey) headers["x-api-key"] = process.env.JUPITER_API_KEY;
      const jupiterBase = hasJupiterKey ? "https://api.jup.ag" : "https://lite-api.jup.ag";
      const quoteResponse = await fetch(jupiterBase + "/ultra/v1/order?" + params.toString(), { headers, signal: controller.signal });
      const quote = await quoteResponse.json().catch(() => ({}));

      if (!quoteResponse.ok || quote.errorCode || quote.error || !quote.outAmount) {
        return res.status(422).json({
          ok: false,
          error: quote.errorMessage || quote.error || quote.errorCode || "no_executable_exit_quote",
          provider: "Jupiter Ultra V3",
          intelligence,
          capitalRule: "No executable exit quote means AUTO does not count the displayed position value as realizable capital."
        });
      }

      const impact = Number(quote.priceImpactPct);
      const impactVerified = Number.isFinite(impact);
      const withinPriceImpactLimit = impactVerified ? impact <= maxPriceImpactPct : null;
      const markPriceUsd = Number(intelligence?.jupiter?.usdPrice ?? intelligence?.liquidity?.deepestPair?.priceUsd);
      const numericTokenAmount = Number(tokenAmount);
      const notionalMarkValueUsd = Number.isFinite(markPriceUsd) && Number.isFinite(numericTokenAmount)
        ? markPriceUsd * numericTokenAmount
        : null;

      return res.json({
        ok: true,
        checkedAt: new Date().toISOString(),
        mode: "READ_ONLY_EXIT_QUOTE",
        provider: "Jupiter Ultra V3",
        tokenMint,
        tokenAmount,
        tokenDecimals,
        outputCurrency,
        outputDecimals,
        quote: {
          requestId: quote.requestId ?? null,
          inAmount: quote.inAmount ?? rawAmount,
          outAmount: quote.outAmount,
          priceImpactPct: quote.priceImpactPct ?? null,
          swapType: quote.swapType ?? null,
          router: quote.router ?? null,
          slippageBps: quote.slippageBps ?? null,
          feeBps: quote.feeBps ?? null
        },
        priceImpactGate: {
          maxPriceImpactPct,
          impactVerified,
          withinLimit: withinPriceImpactLimit,
          status: !impactVerified
            ? "IMPACT_NOT_RETURNED__DO_NOT_ASSUME"
            : withinPriceImpactLimit
              ? "WITHIN_LIMIT"
              : "ABOVE_LIMIT"
        },
        valuation: {
          markPriceUsd: Number.isFinite(markPriceUsd) ? markPriceUsd : null,
          notionalMarkValueUsd,
          rule: "Notional mark value is informational only. The executable exit quote is the realizable-value evidence."
        },
        intelligence,
        executionEnabled: false,
        treasuryRequired: false,
        capitalRule: "Displayed market cap and token position value are not treated as liquid capital unless an executable exit quote exists.",
        note: "Read-only quote. Re-quote immediately before any future wallet signature. No transaction was submitted."
      });
    } catch (error) {
      return res.status(error.name === "AbortError" ? 504 : 502).json({
        ok: false,
        error: error.name === "AbortError" ? "quote_timeout" : "quote_provider_unavailable"
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get("/api/mini/auto/status", authenticateAuto, async (req, res) => {
    try { return res.json({ ...(await autoClient.status()), access: req.autoAuthority }); }
    catch (error) { return res.status(502).json({ ok: false, error: error.code || "auto_status_failed" }); }
  });

  app.get("/api/mini/auto/ultimate", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await ultimateStatusPayload()); }
    catch (error) { return res.status(500).json({ ok: false, error: error.code || "ultimate_status_failed" }); }
  });

  app.post("/api/mini/auto/simulate", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.simulate(req.body || {})); }
    catch (error) { return proxyError(res, error, "auto_simulation_failed", 400); }
  });

  app.post("/api/mini/auto/pause", authenticateAuto, async (req, res) => {
    try { return res.json(await autoClient.pause()); }
    catch (error) { return res.status(502).json({ ok: false, error: error.code || "auto_pause_failed" }); }
  });

  app.post("/api/mini/auto/resume", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.resumeSimulation()); }
    catch (error) { return res.status(502).json({ ok: false, error: error.code || "auto_resume_failed" }); }
  });

  app.post("/api/mini/auto/emergency-stop", authenticateAuto, async (req, res) => {
    try { return res.json(await autoClient.emergencyStop()); }
    catch (error) { return res.status(502).json({ ok: false, error: error.code || "auto_emergency_stop_failed" }); }
  });

  app.get("/api/mini/auto/dca", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.dcaStatus()); }
    catch (error) { return res.status(502).json({ ok: false, error: error.code || "dca_status_failed" }); }
  });

  app.post("/api/mini/auto/dca/wallet", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.dcaSetWallet(req.body?.wallet_address)); }
    catch (error) { return proxyError(res, error, "dca_wallet_update_failed", 400); }
  });

  app.post("/api/mini/auto/dca/limits", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.dcaSetLimits(req.body || {})); }
    catch (error) { return proxyError(res, error, "dca_limits_update_failed", 400); }
  });

  app.post("/api/mini/auto/dca/schedules", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.status(201).json(await autoClient.dcaCreate(req.body || {})); }
    catch (error) { return proxyError(res, error, "dca_schedule_creation_failed", 400); }
  });

  app.post("/api/mini/auto/dca/schedules/:id/:action", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.dcaAction(req.params.id, req.params.action)); }
    catch (error) { return proxyError(res, error, "dca_schedule_update_failed", 409); }
  });

  app.post("/api/mini/auto/dca/enable", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.dcaEnable()); }
    catch (error) { return proxyError(res, error, "dca_enable_failed", 409); }
  });

  app.post("/api/mini/auto/dca/disable", authenticateAuto, ownerOnly, async (req, res) => {
    try { return res.json(await autoClient.dcaDisable()); }
    catch (error) { return res.status(502).json({ ok: false, error: error.code || "dca_disable_failed" }); }
  });
}

module.exports = { registerAutoMiniRoutes, decimalToRawAmount };