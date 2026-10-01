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
        version: "WORLDZ-FEE-FLOW-V2",
        targetGrossTraderFeeBpsWhereProven: 75,
        targetGrossTraderFeePercentWhereProven: 0.75,
        dynamicFeeDefault: false,
        worldzControlledSplitPercent: {
          creator: 51,
          referrer: 17,
          legacyFlywheel: 15,
          worldzLaunchPad: 8.5,
          impact: 8.5
        },
        legacyAdapterProfileOnly: true,
        launchPadContributionChoicesPercent: [3, 5, 8],
        launchPadContributionDefaultPercent: 5,
        fixedSplitPercent: {
          creatorDeveloper: 10,
          launchReferrer: 15,
          legacyCore: 15,
          worldzCoreFamilyMarketBuys: 12,
          lpGrowth: 10,
          launchedTokenBuybackAndBurn: 8,
          impactCharity: 5,
          teamBuilderRewards: 5,
          futureTokenDeploymentReserve: 5
        },
        treasuryReserveByLaunchPadChoice: { "3": 12, "5": 10, "8": 7 },
        legacyTokenCount: 12,
        coreFamilySymbols: ["WLDZ", "RVIV", "PNEX", "MRCL"],
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