"use strict";

const {
  countApproval,
  countSingleChoice,
  countRankedChoiceIRV
} = require("./civic");
const { getGlobalPublicVoiceStatus } = require("./global");

function safeMessage(error) {
  return String(error && (error.message || error.code) || "unavailable")
    .replace(/https?:\/\/[^\s]+/gi, "[URL_REDACTED]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[VALUE_REDACTED]")
    .slice(0, 220);
}

function registerCivicVotesHandlers({ bot, supabase, config }) {
  const send = (msg, text) => bot.sendMessage(msg.chat.id, text);
  const isAdmin = (msg) => {
    const id = String(msg?.from?.id || "");
    return Boolean(id) && (
      id === String(config?.ownerTelegramId || "") ||
      Boolean(config?.adminTelegramIds?.has && config.adminTelegramIds.has(id))
    );
  };

  bot.onText(/^\/worldzvoice(?:@\w+)?$/, (msg) => {
    const global = getGlobalPublicVoiceStatus();
    return send(msg, [
      "🌐 WORLDZ VOTES CENTRE™ — GLOBAL PUBLIC VOICE",
      "",
      "Worldz 🌐 A Better World 🌍",
      "",
      "Worldwide by default — no country or territory allowlist for general non-binding Public Voice.",
      "Uganda • Africa • Indonesia • Philippines • Greenland • Iceland • Mexico • Austria • Belgium • France • Hong Kong • China • India • Australia • everywhere else.",
      "",
      "• Equal civic weight — not weighted by location, nationality, race/ethnicity, wealth, tokens or social status",
      "• General Public Voice is age-inclusive with age-appropriate privacy/safety safeguards",
      "• Official/binding eligibility remains jurisdiction-specific",
      "• Equal option presentation",
      "• No paid ballot advantage",
      "• Rules + sources published before voting",
      "• Private individual choices",
      "• Transparent public count + audit status",
      "",
      "💜 HUMAN-NEEDS MISSION",
      global.humanNeedsMission,
      "",
      "People can document priorities about hunger, preventable disease, healthcare, water, shelter, education and public/community resources.",
      "Worldz does not claim legal authority over government budgets and civic results never execute Worldz treasury actions.",
      "",
      "⚠️ Current civic build is NON-BINDING. Public concerns can be submitted for human review; nothing is published automatically.",
      "",
      "/worldzballots — public civic ballot list",
      "/worldzballot SLUG — ballot details",
      "/worldzresults SLUG — closed/audited public result"
    ].join("\n"));
  });

  bot.onText(/^\/worldzconcerns(?:@\w+)?$/, async (msg) => {
    if (!isAdmin(msg)) return send(msg, "❌ Worldz civic review queue is admin-only.");
    try {
      const { data, error } = await supabase
        .from("worldz_civic_concerns")
        .select("public_id,place_label,topic,title,created_at")
        .eq("status", "review")
        .order("created_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      if (!(data || []).length) return send(msg, "🌐 Worldz Public Voice review queue is clear.");
      return send(msg, [
        "🌐 WORLDZ PUBLIC VOICE — HUMAN REVIEW QUEUE",
        "",
        "Review for privacy, safety, relevance and publication quality. Do not approve/reject based on political viewpoint.",
        "",
        ...(data || []).map((row) => [
          row.public_id,
          `${row.place_label} • ${row.topic}`,
          row.title,
          `/worldzconcern ${row.public_id}`
        ].join("\n"))
      ].join("\n\n"));
    } catch (error) {
      console.warn("Worldz civic concern queue unavailable:", safeMessage(error));
      return send(msg, "❌ Worldz concern review queue is unavailable.");
    }
  });

  bot.onText(/^\/worldzconcern(?:@\w+)?(?:\s+(WZC-[A-Za-z0-9-]+))?$/, async (msg, match) => {
    if (!isAdmin(msg)) return send(msg, "❌ Worldz civic review queue is admin-only.");
    const publicId = String(match && match[1] || "").trim();
    if (!publicId) return send(msg, "Use: /worldzconcern WZC-ID");
    try {
      const { data: row, error } = await supabase
        .from("worldz_civic_concerns")
        .select("public_id,place_label,location_scope,country_or_territory_code,topic,title,summary,language_code,status,source_bundle,created_at")
        .eq("public_id", publicId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return send(msg, "❌ Concern not found.");
      const sources = Array.isArray(row.source_bundle)
        ? row.source_bundle.map((item) => item?.url).filter(Boolean).slice(0, 5)
        : [];
      return send(msg, [
        "🌐 WORLDZ PUBLIC VOICE — REVIEW",
        "",
        `ID: ${row.public_id}`,
        `Status: ${String(row.status).toUpperCase()}`,
        `Place: ${row.place_label} • ${row.location_scope}${row.country_or_territory_code ? " • " + row.country_or_territory_code : ""}`,
        `Topic: ${row.topic}${row.language_code ? " • " + row.language_code : ""}`,
        "",
        row.title,
        "",
        String(row.summary || "").slice(0, 2500),
        ...(sources.length ? ["", "Sources:", ...sources] : []),
        "",
        "Moderate for privacy/safety/process quality, not political viewpoint.",
        `Publish: /worldzpublish ${row.public_id}`,
        `Reject: /worldzreject ${row.public_id}`
      ].join("\n"));
    } catch (error) {
      console.warn("Worldz civic concern unavailable:", safeMessage(error));
      return send(msg, "❌ Worldz concern is unavailable.");
    }
  });

  bot.onText(/^\/worldzpublish(?:@\w+)?(?:\s+(WZC-[A-Za-z0-9-]+))?$/, async (msg, match) => {
    if (!isAdmin(msg)) return send(msg, "❌ Worldz civic publishing is admin-only.");
    const publicId = String(match && match[1] || "").trim();
    if (!publicId) return send(msg, "Use: /worldzpublish WZC-ID");
    try {
      const { data, error } = await supabase
        .from("worldz_civic_concerns")
        .update({
          status: "published",
          moderation_note: "human-review-approved",
          updated_at: new Date().toISOString()
        })
        .eq("public_id", publicId)
        .eq("status", "review")
        .select("public_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(msg, "❌ Concern is not in review state or was not found.");
      return send(msg, `✅ Published ${publicId}. It is now eligible for the public concern register.`);
    } catch (error) {
      console.warn("Worldz civic concern publish failed:", safeMessage(error));
      return send(msg, "❌ Concern publish failed.");
    }
  });

  bot.onText(/^\/worldzreject(?:@\w+)?(?:\s+(WZC-[A-Za-z0-9-]+))?$/, async (msg, match) => {
    if (!isAdmin(msg)) return send(msg, "❌ Worldz civic moderation is admin-only.");
    const publicId = String(match && match[1] || "").trim();
    if (!publicId) return send(msg, "Use: /worldzreject WZC-ID");
    try {
      const { data, error } = await supabase
        .from("worldz_civic_concerns")
        .update({
          status: "rejected",
          moderation_note: "human-review-rejected",
          updated_at: new Date().toISOString()
        })
        .eq("public_id", publicId)
        .eq("status", "review")
        .select("public_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(msg, "❌ Concern is not in review state or was not found.");
      return send(msg, `🗂 Rejected ${publicId}. It will not appear in the public register.`);
    } catch (error) {
      console.warn("Worldz civic concern rejection failed:", safeMessage(error));
      return send(msg, "❌ Concern rejection failed.");
    }
  });

  bot.onText(/^\/worldzballots(?:@\w+)?$/, async (msg) => {
    try {
      const { data, error } = await supabase
        .from("worldz_civic_ballots")
        .select("slug,title,jurisdiction,status,method,opens_at,closes_at,binding_state")
        .in("status", ["preview","open","closed","counted","audited","archived"])
        .order("opens_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!(data || []).length) return send(msg, "🌐 No public civic ballots are published yet.");
      return send(msg, [
        "🌐 WORLDZ CIVIC BALLOTS",
        "",
        ...(data || []).map((row) =>
          `${row.title} • ${row.jurisdiction} • ${String(row.status).toUpperCase()}\n/worldzballot ${row.slug}`
        )
      ].join("\n\n"));
    } catch (error) {
      console.warn("Worldz civic ballots unavailable:", safeMessage(error));
      return send(msg, "🌐 Civic voting foundation is built, but the reviewed civic database/eligibility layer is not active on this runtime yet.");
    }
  });

  bot.onText(/^\/worldzballot(?:@\w+)?(?:\s+([A-Za-z0-9._-]+))?$/, async (msg, match) => {
    const slug = String(match && match[1] || "").trim();
    if (!slug) return send(msg, "Use: /worldzballot SLUG");
    try {
      const { data: ballot, error } = await supabase
        .from("worldz_civic_ballots")
        .select("id,slug,title,summary,jurisdiction,status,method,opens_at,closes_at,binding_state,legal_review_state,source_bundle")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!ballot) return send(msg, "❌ That civic ballot is not published.");

      const { data: options, error: optionError } = await supabase
        .from("worldz_civic_options")
        .select("option_key,label,description")
        .eq("ballot_id", ballot.id)
        .order("option_key");
      if (optionError) throw optionError;

      return send(msg, [
        `🌐 ${ballot.title}`,
        `${ballot.jurisdiction} • ${String(ballot.status).toUpperCase()} • ${ballot.method}`,
        "",
        ballot.summary,
        "",
        ...(options || []).map((row) => `• ${row.label} — ${row.description}`),
        "",
        `Opens: ${ballot.opens_at}`,
        `Closes: ${ballot.closes_at}`,
        `Status: ${ballot.binding_state}`,
        "",
        "Vote casting is not enabled until the reviewed eligibility/privacy credential layer is active."
      ].join("\n"));
    } catch (error) {
      console.warn("Worldz civic ballot unavailable:", safeMessage(error));
      return send(msg, "❌ Civic ballot data is not active on this runtime yet.");
    }
  });

  bot.onText(/^\/worldzresults(?:@\w+)?(?:\s+([A-Za-z0-9._-]+))?$/, async (msg, match) => {
    const slug = String(match && match[1] || "").trim();
    if (!slug) return send(msg, "Use: /worldzresults SLUG");
    try {
      const { data: ballot, error } = await supabase
        .from("worldz_civic_ballots")
        .select("id,slug,title,status,method,closes_at")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!ballot) return send(msg, "❌ That civic ballot is not published.");
      if (!["closed","counted","audited","archived"].includes(ballot.status) || new Date(ballot.closes_at) > new Date()) {
        return send(msg, "🔒 Results remain hidden until the ballot closes.");
      }

      const [{ data: options, error: optionError }, { data: votes, error: voteError }] = await Promise.all([
        supabase.from("worldz_civic_options").select("option_key,label").eq("ballot_id", ballot.id),
        supabase.from("worldz_civic_votes").select("selections").eq("ballot_id", ballot.id)
      ]);
      if (optionError) throw optionError;
      if (voteError) throw voteError;

      const ids = (options || []).map((row) => row.option_key);
      const ballots = (votes || []).map((row) => Array.isArray(row.selections) ? row.selections : []);
      let result;
      if (ballot.method === "approval") result = countApproval(ballots, ids);
      else if (ballot.method === "single-choice") result = countSingleChoice(ballots, ids);
      else result = countRankedChoiceIRV(ballots, ids);

      const labels = Object.fromEntries((options || []).map((row) => [row.option_key, row.label]));
      if (result.totals) {
        return send(msg, [
          `🌐 ${ballot.title} — PUBLIC RESULT`,
          `Method: ${result.method}`,
          `Ballots: ${result.totalBallots}`,
          "",
          ...Object.entries(result.totals).map(([id,total]) => `${labels[id] || id}: ${total}`),
          "",
          "Result publication does not make a non-binding consultation legally binding."
        ].join("\n"));
      }

      return send(msg, [
        `🌐 ${ballot.title} — PUBLIC RESULT`,
        `Method: ${result.method}`,
        `Status: ${result.status}`,
        result.winner ? `Final winner: ${labels[result.winner] || result.winner}` : `Tie requires the published resolution procedure: ${(result.tiedLowest || []).map((id) => labels[id] || id).join(", ")}`,
        `Rounds counted: ${result.rounds.length}`,
        "",
        "Result publication does not make a non-binding consultation legally binding."
      ].join("\n"));
    } catch (error) {
      console.warn("Worldz civic results unavailable:", safeMessage(error));
      return send(msg, "❌ Civic result data is not active on this runtime yet.");
    }
  });
}

module.exports = { registerCivicVotesHandlers };
