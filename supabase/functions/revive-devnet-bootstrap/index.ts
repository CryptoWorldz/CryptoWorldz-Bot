import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "worldz-revive-devnet-bootstrap";
const REPOSITORY = "CryptoWorldz/CryptoWorldz-Bot";
const REPOSITORY_ID = "1315658579";
const REQUIRED_REF = "refs/heads/revive-v1-build";
const REQUIRED_WORKFLOW_REF =
  "CryptoWorldz/CryptoWorldz-Bot/.github/workflows/validate-revive-v1.yml@refs/heads/revive-v1-build";
const RPC = "https://api.devnet.solana.com";
const JWKS = createRemoteJWKSet(new URL(ISSUER + "/.well-known/jwks"));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Worldz-REVIVE-Devnet-Bootstrap/2.0",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const x = await r.json();
  if (!r.ok || x.error) {
    throw new Error(x?.error?.message || "devnet_rpc_" + r.status);
  }
  return x.result;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ ok: false, error: "POST required" }, 405);
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return json({ ok: false, error: "missing GitHub OIDC token" }, 401);
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (String(payload.repository || "") !== REPOSITORY) {
      return json({ ok: false, error: "repository not allowed" }, 403);
    }
    if (String(payload.repository_id || "") !== REPOSITORY_ID) {
      return json({ ok: false, error: "repository id not allowed" }, 403);
    }
    if (String(payload.repository_visibility || "") !== "private") {
      return json({ ok: false, error: "repository visibility not allowed" }, 403);
    }
    if (String(payload.event_name || "") !== "push") {
      return json({ ok: false, error: "event not allowed" }, 403);
    }
    if (String(payload.ref || "") !== REQUIRED_REF) {
      return json({ ok: false, error: "ref not allowed" }, 403);
    }
    if (String(payload.workflow_ref || "") !== REQUIRED_WORKFLOW_REF) {
      return json({ ok: false, error: "workflow not allowed" }, 403);
    }
    if (String(payload.runner_environment || "") !== "github-hosted") {
      return json({ ok: false, error: "runner environment not allowed" }, 403);
    }

    const body = await req.json();
    const address = String(body?.address || "");
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return json({ ok: false, error: "invalid Solana address" }, 400);
    }

    let balance = Number(
      (await rpc("getBalance", [address, { commitment: "confirmed" }]))?.value || 0,
    );
    if (balance >= 10_000) {
      return json({
        ok: true,
        funded: false,
        balanceLamports: balance,
        runId: String(payload.run_id || ""),
      });
    }

    // Devnet only: enough transaction gas to start the PoW faucet flow.
    const lamports = 20_000;
    const signature = await rpc("requestAirdrop", [
      address,
      lamports,
      { commitment: "confirmed" },
    ]);

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      balance = Number(
        (await rpc("getBalance", [address, { commitment: "confirmed" }]))?.value || 0,
      );
      if (balance >= 5_000) {
        return json({
          ok: true,
          funded: true,
          signature,
          balanceLamports: balance,
          runId: String(payload.run_id || ""),
        });
      }
    }

    return json(
      {
        ok: false,
        error: "bootstrap confirmation timeout",
        signature,
        balanceLamports: balance,
      },
      502,
    );
  } catch (e) {
    console.error(e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      502,
    );
  }
});
