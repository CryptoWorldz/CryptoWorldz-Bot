"use strict";

const crypto = require("node:crypto");

const {
  CIVIC_PRINCIPLES,
  countApproval,
  countSingleChoice,
  countRankedChoiceIRV
} = require("./civic");
const { GLOBAL_HUMAN_NEEDS, getGlobalPublicVoiceStatus } = require("./global");

const CONCERN_TOPICS = Object.freeze([
  ...GLOBAL_HUMAN_NEEDS,
  "other-public-concern"
]);

const CONCERN_LOCATION_SCOPES = Object.freeze([
  "global",
  "country",
  "territory",
  "region",
  "local"
]);

const DISALLOWED_CONCERN_FIELDS = Object.freeze([
  "name",
  "email",
  "phone",
  "address",
  "exactAddress",
  "dateOfBirth",
  "race",
  "ethnicity",
  "wallet",
  "walletAddress"
]);

function createConcernSubmissionLimiter({ limit = 3, windowMs = 10 * 60 * 1000 } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = String(req.ip || req.socket?.remoteAddress || "unknown");
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > limit) {
      return res.status(429).json({
        ok: false,
        error: "civic_concern_rate_limited",
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      });
    }
    return next();
  };
}

function normalizeSourceBundle(input) {
  if (input == null) return { value: [], invalid: false };
  if (!Array.isArray(input) || input.length > 5) return { value: [], invalid: true };

  const value = [];
  for (const item of input) {
    const raw = typeof item === "string" ? item : item && typeof item.url === "string" ? item.url : "";
    if (!raw || raw.length > 500) return { value: [], invalid: true };
    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol)) return { value: [], invalid: true };
      value.push({ url: url.toString() });
    } catch {
      return { value: [], invalid: true };
    }
  }
  return { value, invalid: false };
}

function normalizeConcernSubmission(body = {}) {
  const invalid = [];
  const forbiddenFields = DISALLOWED_CONCERN_FIELDS.filter((field) => body[field] != null && String(body[field]).trim() !== "");
  if (forbiddenFields.length) invalid.push("private_identity_fields");

  const topic = String(body.topic || "").trim();
  const locationScope = String(body.location_scope || body.locationScope || "global").trim();
  const countryOrTerritoryCode = String(body.country_or_territory_code || body.countryOrTerritoryCode || "").trim().toUpperCase();
  const placeLabel = String(body.place_label || body.placeLabel || "Worldwide").trim();
  const title = String(body.title || "").trim();
  const summary = String(body.summary || "").trim();
  const languageCode = String(body.language_code || body.languageCode || "").trim();
  const privacyAcknowledged = body.privacy_acknowledged === true || body.privacyAcknowledged === true;
  const reviewAcknowledged = body.review_acknowledged === true || body.reviewAcknowledged === true;
  const sources = normalizeSourceBundle(body.sources || body.source_bundle || body.sourceBundle);

  if (!CONCERN_TOPICS.includes(topic)) invalid.push("topic");
  if (!CONCERN_LOCATION_SCOPES.includes(locationScope)) invalid.push("location_scope");
  if (countryOrTerritoryCode && !/^[A-Z0-9-]{2,12}$/.test(countryOrTerritoryCode)) invalid.push("country_or_territory_code");
  if (placeLabel.length < 2 || placeLabel.length > 120) invalid.push("place_label");
  if (title.length < 5 || title.length > 160) invalid.push("title");
  if (summary.length < 20 || summary.length > 3000) invalid.push("summary");
  if (languageCode && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(languageCode)) invalid.push("language_code");
  if (sources.invalid) invalid.push("sources");
  if (!privacyAcknowledged) invalid.push("privacy_acknowledged");
  if (!reviewAcknowledged) invalid.push("review_acknowledged");

  return {
    invalid: [...new Set(invalid)],
    value: {
      place_label: placeLabel,
      location_scope: locationScope,
      country_or_territory_code: countryOrTerritoryCode || null,
      topic,
      title,
      summary,
      language_code: languageCode || null,
      source_bundle: sources.value
    }
  };
}

function normalizeConcernListQuery(query = {}) {
  const rawTopic = String(query.topic || "").trim();
  const rawLocationScope = String(query.location_scope || query.locationScope || "").trim();
  const rawCountry = String(query.country_or_territory_code || query.countryOrTerritoryCode || "").trim().toUpperCase();
  const rawLanguage = String(query.language_code || query.languageCode || "").trim();
  const rawLimit = Number.parseInt(String(query.limit || "25"), 10);

  const invalid = [];
  if (rawTopic && !CONCERN_TOPICS.includes(rawTopic)) invalid.push("topic");
  if (rawLocationScope && !CONCERN_LOCATION_SCOPES.includes(rawLocationScope)) invalid.push("location_scope");
  if (rawCountry && !/^[A-Z0-9-]{2,12}$/.test(rawCountry)) invalid.push("country_or_territory_code");
  if (rawLanguage && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(rawLanguage)) invalid.push("language_code");

  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 25;

  return {
    invalid,
    topic: rawTopic || null,
    locationScope: rawLocationScope || null,
    countryOrTerritoryCode: rawCountry || null,
    languageCode: rawLanguage || null,
    limit
  };
}

function registerCivicVotesRoutes({ app, supabase }) {
  const allowConcernSubmission = createConcernSubmissionLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });
  app.get("/api/worldz-votes/civic/status", (_req, res) => {
    res.json({
      ok: true,
      brand: "Worldz Votes Centre™",
      layer: "civic-public-voice",
      bindingVotingEnabled: false,
      voteCastingEnabled: false,
      concernSubmissionEnabled: true,
      concernAutoPublicationEnabled: false,
      globalPublicVoice: getGlobalPublicVoiceStatus(),
      principles: CIVIC_PRINCIPLES
    });
  });

  app.get("/api/worldz-votes/civic/worldwide", (_req, res) => {
    res.json({
      ok: true,
      ...getGlobalPublicVoiceStatus(),
      concernRegistry: {
        designed: true,
        publicReadEnabled: true,
        publicSubmissionEnabled: true,
        autoPublicationEnabled: false,
        reason: "Submissions enter a private human-review queue. Nothing is published automatically."
      }
    });
  });

  app.get("/api/worldz-votes/civic/priorities", (_req, res) => {
    const status = getGlobalPublicVoiceStatus();
    res.json({
      ok: true,
      brand: status.brand,
      scope: status.scope,
      binding: false,
      officialBudgetAuthority: status.officialBudgetAuthority,
      treasuryExecution: status.treasuryExecution,
      mission: status.humanNeedsMission,
      topics: status.humanNeedsTopics,
      statement: "These are non-binding public priority categories. They document what people want prioritised; they do not move public money or Worldz treasury funds."
    });
  });

  app.get("/api/worldz-votes/civic/concerns", async (req, res) => {
    const filters = normalizeConcernListQuery(req.query || {});
    if (filters.invalid.length) {
      return res.status(400).json({
        ok: false,
        error: "invalid_civic_concern_filter",
        invalid: filters.invalid
      });
    }

    let query = supabase
      .from("worldz_civic_concerns")
      .select("public_id,place_label,location_scope,country_or_territory_code,topic,title,summary,language_code,status,source_bundle,created_at")
      .eq("status", "published");

    if (filters.topic) query = query.eq("topic", filters.topic);
    if (filters.locationScope) query = query.eq("location_scope", filters.locationScope);
    if (filters.countryOrTerritoryCode) query = query.eq("country_or_territory_code", filters.countryOrTerritoryCode);
    if (filters.languageCode) query = query.eq("language_code", filters.languageCode);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(filters.limit);

    if (error) return res.status(503).json({ ok: false, error: "civic_concern_registry_not_active" });
    return res.json({
      ok: true,
      readOnly: true,
      submissionEnabled: true,
      autoPublicationEnabled: false,
      filters: {
        topic: filters.topic,
        locationScope: filters.locationScope,
        countryOrTerritoryCode: filters.countryOrTerritoryCode,
        languageCode: filters.languageCode,
        limit: filters.limit
      },
      concerns: data || []
    });
  });


  app.post("/api/worldz-votes/civic/concerns", allowConcernSubmission, async (req, res) => {
    const normalized = normalizeConcernSubmission(req.body || {});
    if (normalized.invalid.length) {
      return res.status(400).json({
        ok: false,
        error: "invalid_civic_concern_submission",
        invalid: normalized.invalid,
        message: "Submit the public concern only. Do not include names, contact details, exact home addresses, wallet addresses or demographic identity fields."
      });
    }

    const publicId = `WZC-${crypto.randomUUID()}`;
    const row = {
      public_id: publicId,
      ...normalized.value,
      status: "review",
      moderation_note: "public-intake-pending-human-review"
    };

    const { error } = await supabase.from("worldz_civic_concerns").insert(row);
    if (error) {
      console.error("Worldz civic concern intake failed", { code: error.code || "unknown" });
      return res.status(503).json({ ok: false, error: "civic_concern_intake_unavailable" });
    }

    return res.status(202).json({
      ok: true,
      publicId,
      status: "review",
      published: false,
      binding: false,
      officialBudgetAuthority: false,
      treasuryExecution: false,
      message: "Concern received for human review. Submission does not create an official vote, budget decision or Worldz treasury action."
    });
  });

  app.get("/api/worldz-votes/civic/ballots", async (_req, res) => {
    const { data, error } = await supabase
      .from("worldz_civic_ballots")
      .select("slug,title,summary,jurisdiction,status,method,opens_at,closes_at,binding_state,legal_review_state")
      .in("status", ["preview","open","closed","counted","audited","archived"])
      .order("opens_at", { ascending: false })
      .limit(50);
    if (error) return res.status(503).json({ ok: false, error: "civic_database_not_active" });
    return res.json({ ok: true, ballots: data || [] });
  });

  app.get("/api/worldz-votes/civic/ballots/:slug", async (req, res) => {
    const slug = String(req.params.slug || "").trim();
    const { data: ballot, error } = await supabase
      .from("worldz_civic_ballots")
      .select("id,slug,title,summary,jurisdiction,status,method,opens_at,closes_at,binding_state,legal_review_state,source_bundle,rules")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return res.status(503).json({ ok: false, error: "civic_database_not_active" });
    if (!ballot || !["preview","open","closed","counted","audited","archived"].includes(ballot.status)) {
      return res.status(404).json({ ok: false, error: "ballot_not_found" });
    }
    const { data: options, error: optionError } = await supabase
      .from("worldz_civic_options")
      .select("option_key,label,description,source_bundle")
      .eq("ballot_id", ballot.id)
      .order("option_key");
    if (optionError) return res.status(503).json({ ok: false, error: "civic_database_not_active" });
    delete ballot.id;
    return res.json({ ok: true, ballot: { ...ballot, options: options || [] } });
  });

  app.get("/api/worldz-votes/civic/ballots/:slug/results", async (req, res) => {
    const slug = String(req.params.slug || "").trim();
    const { data: ballot, error } = await supabase
      .from("worldz_civic_ballots")
      .select("id,slug,title,status,method,closes_at,binding_state")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return res.status(503).json({ ok: false, error: "civic_database_not_active" });
    if (!ballot) return res.status(404).json({ ok: false, error: "ballot_not_found" });
    if (!["closed","counted","audited","archived"].includes(ballot.status) || new Date(ballot.closes_at) > new Date()) {
      return res.status(423).json({ ok: false, error: "results_locked_until_close" });
    }

    const [{ data: options, error: optionError }, { data: votes, error: voteError }] = await Promise.all([
      supabase.from("worldz_civic_options").select("option_key,label").eq("ballot_id", ballot.id),
      supabase.from("worldz_civic_votes").select("selections").eq("ballot_id", ballot.id)
    ]);
    if (optionError || voteError) return res.status(503).json({ ok: false, error: "civic_database_not_active" });

    const ids = (options || []).map((row) => row.option_key);
    const selections = (votes || []).map((row) => Array.isArray(row.selections) ? row.selections : []);
    let result;
    if (ballot.method === "approval") result = countApproval(selections, ids);
    else if (ballot.method === "single-choice") result = countSingleChoice(selections, ids);
    else result = countRankedChoiceIRV(selections, ids);

    return res.json({
      ok: true,
      ballot: {
        slug: ballot.slug,
        title: ballot.title,
        method: ballot.method,
        bindingState: ballot.binding_state
      },
      labels: Object.fromEntries((options || []).map((row) => [row.option_key, row.label])),
      result
    });
  });
}

module.exports = {
  CONCERN_LOCATION_SCOPES,
  CONCERN_TOPICS,
  DISALLOWED_CONCERN_FIELDS,
  createConcernSubmissionLimiter,
  normalizeConcernListQuery,
  normalizeConcernSubmission,
  normalizeSourceBundle,
  registerCivicVotesRoutes
};
