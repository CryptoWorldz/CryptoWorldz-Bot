const { createRequestLimiter, validateTelegramInitData } = require("../miniapp-auth");
const {
  ULTIMATE_PROVIDER_CAPABILITIES,
  ULTIMATE_SIGNERS,
  nextFundingWindow,
  ultimatePublicBlueprint
} = require("./ultimate-blueprint");

function registerAutoMiniRoutes({ app, config, autoClient, supabase }) {
  const allowRequest = createRequestLimiter({ maxEvents: 30, intervalMs: 60000 });

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
    if (!autoClient.configured()) return res.status(503).json({ ok: false, error: "auto_not_configured" });
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
          operationsPercent: 70,
          miracleTeamPercent: 30,
          operationsGovernance: "3-of-5",
          miracleTeamGovernance: "4-of-7"
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

module.exports = { registerAutoMiniRoutes };