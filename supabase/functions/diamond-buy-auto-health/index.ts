import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "access-control-allow-origin": "*",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function db(path: string, count = false) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE,
      authorization: `Bearer ${SERVICE_ROLE}`,
      ...(count ? { prefer: "count=exact" } : {})
    }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return reply(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const [settingsResponse, schedulesResponse, executionsResponse] = await Promise.all([
      db("auto_dca_settings?select=id,mode,wallet_address,enabled,execution_enabled,paused,emergency_stop,buy_only,allowed_input_currency,max_order_amount,max_daily_amount,max_weekly_amount,max_monthly_amount,min_interval_minutes,max_buys_per_day&id=eq.1&limit=1"),
      db("auto_dca_schedules?select=id", true),
      db("auto_dca_executions?select=id", true)
    ]);

    if (!settingsResponse.ok || !schedulesResponse.ok || !executionsResponse.ok) {
      return reply(503, {
        ok: false,
        service: "Diamond Buy Auto Health",
        database_access: false,
        status_codes: {
          settings: settingsResponse.status,
          schedules: schedulesResponse.status,
          executions: executionsResponse.status
        }
      });
    }

    const settingsRows = await settingsResponse.json();
    const settings = settingsRows[0] || null;
    const count = (response: Response) => Number(response.headers.get("content-range")?.split("/")[1] || 0);

    return reply(200, {
      ok: true,
      service: "Diamond Buy Auto Health",
      database_access: true,
      safe_locked: Boolean(settings && !settings.enabled && !settings.execution_enabled && settings.paused && settings.emergency_stop),
      settings,
      schedules: count(schedulesResponse),
      executions: count(executionsResponse),
      signing_available: false,
      transaction_submission_available: false
    });
  } catch (error) {
    return reply(503, {
      ok: false,
      service: "Diamond Buy Auto Health",
      database_access: false,
      error: error instanceof Error ? error.name : "UNKNOWN"
    });
  }
});
