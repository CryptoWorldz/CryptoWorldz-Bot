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
const ORDER_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOL_SIGNATURE=/^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

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
    const orderId = String(url.searchParams.get("order") || "").trim();
    if (orderId) {
      if (!ORDER_ID.test(orderId)) return json(req, { ok: false, error: "invalid_order_id" }, 400);
      const { data, error } = await supabase
        .from("worldz_launchpad_ads")
        .select("id,project_name,token_symbol,chain,status,slot,package_code,price_aud,duration_days,payment_currency,payment_amount,payment_destination,payment_submitted_at,payment_verified_at,approved_at,activated_at,start_at,end_at,reviewer_note")
        .eq("id", orderId)
        .maybeSingle();
      if (error) return json(req, { ok: false, error: "order_read_failed" }, 500);
      if (!data) return json(req, { ok: false, error: "order_not_found" }, 404);
      return json(req, { ok: true, order: data });
    }

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

  const action = clean(form.get("action"), 32).toLowerCase();
  if (action === "receipt") {
    const orderId = clean(form.get("order_id"), 64);
    const signature = clean(form.get("payment_signature"), 100);
    if (!ORDER_ID.test(orderId)) return json(req, { ok: false, error: "invalid_order_id" }, 400);
    if (!SOL_SIGNATURE.test(signature)) return json(req, { ok: false, error: "invalid_solana_signature" }, 400);

    const { data: order, error: orderError } = await supabase
      .from("worldz_launchpad_ads")
      .select("id,status,payment_currency,payment_amount,payment_destination,payment_signature")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) return json(req, { ok: false, error: "order_read_failed" }, 500);
    if (!order) return json(req, { ok: false, error: "order_not_found" }, 404);
    if (!["approved","payment_review"].includes(String(order.status))) {
      return json(req, { ok: false, error: "order_not_awaiting_payment" }, 409);
    }
    if (!order.payment_currency || !Number(order.payment_amount) || !order.payment_destination) {
      return json(req, { ok: false, error: "payment_quote_not_ready" }, 409);
    }
    if (order.payment_signature && order.payment_signature === signature && order.status === "payment_review") {
      return json(req, { ok: true, order: { id: order.id, status: order.status }, note: "Receipt already submitted and awaiting on-chain review." });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("worldz_launchpad_ads")
      .update({
        payment_signature: signature,
        payment_submitted_at: now,
        status: "payment_review",
        updated_at: now
      })
      .eq("id", orderId)
      .in("status", ["approved","payment_review"])
      .select("id,status,payment_currency,payment_amount,payment_destination,payment_submitted_at")
      .maybeSingle();
    if (error) {
      if (String(error.code || "") === "23505") return json(req, { ok: false, error: "signature_already_used" }, 409);
      return json(req, { ok: false, error: "receipt_submit_failed" }, 500);
    }
    if (!data) return json(req, { ok: false, error: "order_not_awaiting_payment" }, 409);
    return json(req, {
      ok: true,
      order: data,
      note: "Receipt recorded. Worldz will verify the finalized on-chain transfer before the sponsored placement is activated."
    });
  }

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
    .in("status", ["pending_review","approved","payment_review","active"]);
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
      note: "No payment is requested until the ad passes Worldz review. Approved ads receive a SOL/USDC payment quote tied to the Worldz Operations Treasury."
    }
  }, 201);
});
