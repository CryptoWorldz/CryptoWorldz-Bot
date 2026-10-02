"use strict";

const {
  CIVIC_PRINCIPLES,
  countApproval,
  countSingleChoice,
  countRankedChoiceIRV
} = require("./civic");
const { getGlobalPublicVoiceStatus } = require("./global");

function registerCivicVotesRoutes({ app, supabase }) {
  app.get("/api/worldz-votes/civic/status", (_req, res) => {
    res.json({
      ok: true,
      brand: "Worldz Votes Centre™",
      layer: "civic-public-voice",
      bindingVotingEnabled: false,
      voteCastingEnabled: false,
      concernSubmissionEnabled: false,
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
        publicSubmissionEnabled: false,
        reason: "Moderation, privacy, abuse-prevention and age-appropriate safety gates are required before public writes."
      }
    });
  });

  app.get("/api/worldz-votes/civic/concerns", async (_req, res) => {
    const { data, error } = await supabase
      .from("worldz_civic_concerns")
      .select("public_id,place_label,location_scope,topic,title,summary,language_code,status,source_bundle,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return res.status(503).json({ ok: false, error: "civic_concern_registry_not_active" });
    return res.json({ ok: true, concerns: data || [] });
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

module.exports = { registerCivicVotesRoutes };
