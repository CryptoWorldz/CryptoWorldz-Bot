import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@6.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const BATCH = "4b7faa3f-c6cd-435f-9840-43a04cd090a0";
const ROOT = "b0a58be30c8323bf22d57939cd989be6b1631f5dd17a682cd829d0cc6a85e548";
const RVIV_MINT = "DnpNayNJqzoXnz1tHgJpCq345kNdxzJPo8RAdCeNqx9R";
const DECIMALS = 6;
const CLAIM_EXECUTION_ENABLED = false;

const cors = {
  "access-control-allow-origin": "https://launchpad.cryptoworldz.xyz",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
  });

function tokensFromRaw(raw: string) {
  const n = BigInt(raw);
  const base = 10n ** BigInt(DECIMALS);
  const whole = n / base;
  const frac = (n % base).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

async function entitlement(wallet: string) {
  const { data, error } = await db
    .from("worldz_legacy_revive_entitlements")
    .select("owner_wallet,legacy_assets_held,revive_amount_raw,claim_status,claim_wallet,claimed_at,proof")
    .eq("snapshot_batch", BATCH)
    .eq("owner_wallet", wallet)
    .maybeSingle();
  if (error) throw new Error("entitlement_lookup_failed");
  return data;
}

function verifySignature(body: any) {
  const wallet = String(body.wallet || "");
  const issuedAt = String(body.issued_at || "");
  const signature = String(body.signature || "");
  const ts = Date.parse(issuedAt);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    throw new Error("signature_timestamp_expired");
  }
  const message = [
    "REVIVE_LEGACY_CLAIM_V1",
    "action=VERIFY_ENTITLEMENT",
    "wallet=" + wallet,
    "batch=" + BATCH,
    "root=" + ROOT,
    "issued_at=" + issuedAt,
  ].join("\n");
  let ok = false;
  try {
    ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      bs58.decode(wallet),
    );
  } catch {
    ok = false;
  }
  if (!ok) throw new Error("invalid_wallet_signature");
  return wallet;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    if (req.method === "GET") {
      return json({
        ok: true,
        token: { name: "REVIVE", symbol: "RVIV", mint: RVIV_MINT, decimals: DECIMALS },
        snapshot: { batch: BATCH, root: ROOT, eligibleWallets: 216, poolTokens: 20000000 },
        claimExecutionEnabled: CLAIM_EXECUTION_ENABLED,
        verificationMode: "wallet_signature_required",
      });
    }

    if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
    const body = await req.json();
    if (String(body.action || "") !== "VERIFY_ENTITLEMENT") {
      return json({ ok: false, error: "unknown_action" }, 400);
    }

    const wallet = verifySignature(body);
    const row = await entitlement(wallet);
    if (!row) {
      return json({
        ok: true,
        eligible: false,
        wallet,
        snapshotRoot: ROOT,
        claimExecutionEnabled: CLAIM_EXECUTION_ENABLED,
      });
    }

    return json({
      ok: true,
      eligible: true,
      wallet,
      snapshotRoot: ROOT,
      legacyAssetsHeld: row.legacy_assets_held,
      entitlementRaw: String(row.revive_amount_raw),
      entitlementTokens: tokensFromRaw(String(row.revive_amount_raw)),
      claimStatus: row.claim_status,
      claimExecutionEnabled: CLAIM_EXECUTION_ENABLED,
      nextAction: CLAIM_EXECUTION_ENABLED
        ? "claim_transaction_required"
        : "verified_entitlement_only__claim_execution_locked",
    });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
