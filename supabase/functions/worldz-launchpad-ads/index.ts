import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRICING: Record<string,{days:number,priceAud:number,label:string}> = {
  one_day: { days: 1, priceAud: 5, label: "1 day" },
  three_day: { days: 3, priceAud: 12, label: "3 days" },
  seven_day: { days: 7, priceAud: 22, label: "7 days" },
  thirty_day: { days: 30, priceAud: 75, label: "30 days" }
};

const SLOTS = new Set(["home_spotlight","community_spotlight","launch_station_spotlight"]);
const ALLOWED_ORIGINS = new Set([
  "https://launchpad.cryptoworldz.xyz",
  "https://cryptoworldz.xyz",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://launchpad.cryptoworldz.xyz",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin"
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function clean(value: FormDataEntryValue | null, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function httpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json(req, { ok: false, error: "server_not_configured" }, 503);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  if (req.method === "GET") {
    const slot = String(url.searchParams.get("slot") || "home_spotlight");
    if (!SLOTS.has(slot)) return json(req, { ok: false, error: "invalid_slot" }, 400);

    const now = Date.now();
    const { data, error } = await supabase
      .from("worldz_launchpad_ads")
      .select("id,project_name,token_symbol,chain,target_url,banner_url,slot,start_at,end_at")
      .eq("slot", slot)
      .eq("status", "active")
      .order("activated_at", { ascending: false, nullsFirst: false })
      .limit(20);

    if (error) return json(req, { ok: false, error: "read_failed" }, 500);

    const ads = (data || []).filter((row:any) => {
      const start = row.start_at ? Date.parse(row.start_at) : 0;
      const end = row.end_at ? Date.parse(row.end_at) : Number.POSITIVE_INFINITY;
      return start <= now && now < end;
    }).slice(0, 3);

    return json(req, { ok: true, slot, ads });
  }

  if (req.method !== "POST") return json(req, { ok: false, error: "method_not_allowed" }, 405);

  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { ok: false, error: "origin_not_allowed" }, 403);

  let form: FormData;
  try { form = await req.formData(); }
  catch { return json(req, { ok: false, error: "multipart_form_required" }, 400); }

  const projectName = clean(form.get("project_name"), 80);
  const tokenSymbol = clean(form.get("token_symbol"), 20).toUpperCase().replace(/^\$/,"");
  const chain = clean(form.get("chain"), 40);
  const targetUrl = httpsUrl(clean(form.get("target_url"), 500));
  const contact = clean(form.get("contact"), 180);
  const slot = clean(form.get("slot"), 40);
  const packageCode = clean(form.get("package_code"), 40);
  const pkg = PRICING[packageCode];
  const banner = form.get("banner");

  if (projectName.length < 2) return json(req, { ok: false, error: "project_name_required" }, 400);
  if (!targetUrl) return json(req, { ok: false, error: "https_target_url_required" }, 400);
  if (contact.length < 3) return json(req, { ok: false, error: "contact_required" }, 400);
  if (!SLOTS.has(slot)) return json(req, { ok: false, error: "invalid_slot" }, 400);
  if (!pkg) return json(req, { ok: false, error: "invalid_package" }, 400);
  if (!(banner instanceof File)) return json(req, { ok: false, error: "banner_required" }, 400);
  if (banner.size <= 0 || banner.size > 5 * 1024 * 1024) return json(req, { ok: false, error: "banner_size_invalid" }, 400);

  const allowedTypes = new Set(["image/jpeg","image/png","image/gif","image/webp"]);
  if (!allowedTypes.has(banner.type)) return json(req, { ok: false, error: "banner_type_invalid" }, 400);

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("worldz_launchpad_ads")
    .select("id", { count: "exact", head: true })
    .eq("contact", contact)
    .gte("created_at", cutoff)
    .in("status", ["pending_review","approved"]);
  if ((count || 0) >= 3) return json(req, { ok: false, error: "submission_limit_reached" }, 429);

  const extension = banner.type === "image/jpeg" ? "jpg" : banner.type.split("/")[1];
  const objectPath = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await banner.arrayBuffer());
  const upload = await supabase.storage.from("launchpad-ad-banners").upload(objectPath, bytes, {
    contentType: banner.type,
    cacheControl: "3600",
    upsert: false
  });
  if (upload.error) return json(req, { ok: false, error: "banner_upload_failed" }, 500);

  const publicUrl = supabase.storage.from("launchpad-ad-banners").getPublicUrl(objectPath).data.publicUrl;
  const { data, error } = await supabase.from("worldz_launchpad_ads").insert({
    project_name: projectName,
    token_symbol: tokenSymbol || null,
    chain: chain || null,
    target_url: targetUrl,
    banner_url: publicUrl,
    contact,
    slot,
    package_code: packageCode,
    price_aud: pkg.priceAud,
    duration_days: pkg.days,
    status: "pending_review"
  }).select("id,price_aud,duration_days,status").single();

  if (error) {
    await supabase.storage.from("launchpad-ad-banners").remove([objectPath]).catch(()=>{});
    return json(req, { ok: false, error: "submission_failed" }, 500);
  }

  return json(req, {
    ok: true,
    ad: data,
    pricing: { currency: "AUD", package: packageCode, label: pkg.label },
    payment: {
      state: "AFTER_HUMAN_APPROVAL",
      note: "No payment is requested until the ad passes Worldz review. Approved ads receive SOL/USDC payment instructions tied to the Worldz Operations Treasury."
    }
  }, 201);
});
