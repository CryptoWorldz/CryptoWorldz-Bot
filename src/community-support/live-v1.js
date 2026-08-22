const express = require("express");

const ALLOWED_ORIGINS = new Set([
  "https://oneworldz.com",
  "https://www.oneworldz.com",
  "https://donateworldz.com",
  "https://www.donateworldz.com"
]);

function setCors(req, res) {
  const origin = String(req.get("origin") || "").trim();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  }
}

function safePublicLabel(row) {
  const previewTitle = row?.preview_status === "verified" ? String(row?.preview_title || "").trim() : "";
  if (previewTitle) return previewTitle.slice(0, 140);
  const raw = String(row?.display_name || "").trim();
  if (raw && !/^Facebook Support Profile\s+\d+$/i.test(raw)) return raw;
  return "Verified Community Support Link";
}

function safeHttps(value) {
  const text = String(value || "").trim();
  return /^https:\/\//i.test(text) ? text : null;
}

function sanitizeProfile(row) {
  const order = Number(row?.display_order);
  const facebookUrl = String(row?.facebook_url || "").trim();
  if (!Number.isInteger(order) || order < 1 || order > 35) return null;
  if (!/^https:\/\/(?:www\.)?facebook\.com\//i.test(facebookUrl)) return null;
  const rawName = String(row?.display_name || "").trim();
  const resolvedName = Boolean(rawName && !/^Facebook Support Profile\s+\d+$/i.test(rawName));
  const previewStatus = ["pending","verified","restricted","unavailable","error"].includes(String(row?.preview_status || ""))
    ? String(row.preview_status)
    : "pending";
  const verified = previewStatus === "verified" && Boolean(row?.preview_verified_at);
  const preview = verified ? {
    object_id: String(row?.facebook_object_id || "").trim() || null,
    title: String(row?.preview_title || "").trim().slice(0, 140) || null,
    description: String(row?.preview_description || "").trim().slice(0, 500) || null,
    image_url: safeHttps(row?.preview_image_url),
    verified_at: row.preview_verified_at,
    source: String(row?.preview_source || "").trim().slice(0, 80) || null
  } : null;
  return {
    display_order: order,
    display_name: safePublicLabel(row),
    facebook_url: facebookUrl,
    category: String(row?.category || "community_support").trim().slice(0, 80),
    metadata_status: verified ? "verified_facebook_preview" : resolvedName ? "resolved_name_exact_link" : "neutral_verified_link",
    preview_status: previewStatus,
    preview
  };
}

async function fetchProfilesFromSupabase() {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !serviceKey) {
    const error = new Error("community_registry_not_configured");
    error.status = 503;
    throw error;
  }

  const fields = "display_order,display_name,facebook_url,category,status,facebook_object_id,preview_title,preview_description,preview_image_url,preview_verified_at,preview_source,preview_status";
  const url = `${supabaseUrl}/rest/v1/oneworldz_support_profiles?select=${fields}&status=eq.active&order=display_order.asc`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: "application/json"
    },
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    const error = new Error(`community_registry_${response.status}`);
    error.status = 502;
    throw error;
  }
  const profiles = (Array.isArray(payload) ? payload : []).map(sanitizeProfile).filter(Boolean).sort((a, b) => a.display_order - b.display_order);
  if (profiles.length !== 35 || new Set(profiles.map((row) => row.display_order)).size !== 35) {
    const error = new Error(`community_registry_incomplete_${profiles.length}`);
    error.status = 503;
    throw error;
  }
  return profiles;
}

function registerCommunitySupportLive(app) {
  if (!app || typeof app.get !== "function") throw new Error("express_app_required");
  app.use("/api/oneworldz-community-support", express.json({ limit: "2kb" }));
  app.options("/api/oneworldz-community-support", (req, res) => {
    setCors(req, res);
    return res.status(204).end();
  });
  app.get("/api/oneworldz-community-support", async (req, res) => {
    setCors(req, res);
    const origin = String(req.get("origin") || "").trim();
    if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).json({ ok: false, error: "origin_not_allowed" });
    try {
      const profiles = await fetchProfilesFromSupabase();
      return res.json({
        ok: true,
        source: "public.oneworldz_support_profiles",
        count: profiles.length,
        display_order: "1-35",
        verified_previews: profiles.filter((row) => row.preview_status === "verified" && row.preview).length,
        preview_rule: "verified_metadata_or_exact_facebook_link_never_invent",
        profiles
      });
    } catch (error) {
      return res.status(Number(error?.status) || 500).json({ ok: false, error: error?.message || "community_support_failed" });
    }
  });
}

module.exports = {
  ALLOWED_ORIGINS,
  fetchProfilesFromSupabase,
  registerCommunitySupportLive,
  safePublicLabel,
  sanitizeProfile
};
