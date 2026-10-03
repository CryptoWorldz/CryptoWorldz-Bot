(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const root = document.getElementById("worldz-squads-root");
  if (!root) return;

  const state = { period: "1M", data: null };
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" })[c]);
  const money = (value) => {
    const n = Number(value) || 0;
    return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
  };
  const request = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": tg?.initData || "",
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ ok:false,error:"invalid_response" }));
    if (!response.ok) throw Object.assign(new Error(payload.error || "request_failed"), { payload, status: response.status });
    return payload;
  };
  const notify = (message) => tg?.showAlert ? tg.showAlert(message) : window.alert(message);

  function periods() {
    return `<div class="squad-periods">${["1D","1W","1M"].map((period) => `<button type="button" data-squad-period="${period}" class="${period === state.period ? "active" : ""}">${period}</button>`).join("")}</div>`;
  }

  function squadCard(squad, mine = false) {
    const pnlKnown = squad.member_rows?.some((row) => row.performance_source);
    return `<article class="worldz-squad-card ${mine ? "mine" : ""}">
      <div class="squad-kicker">WORLDZ SQUAD • ${esc(state.period)}</div>
      <h3>${esc(squad.name)}</h3>
      <div class="squad-pnl ${Number(squad.pnl_usd) >= 0 ? "positive" : "negative"}">${money(squad.pnl_usd)}</div>
      <div class="squad-caption">${pnlKnown ? "Verified trading PNL" : "Trading PNL awaits verified indexing"}</div>
      <div class="squad-metrics">
        <span><b>${Number(squad.members)||0}</b> Members</span>
        <span><b>${Number(squad.points)||0}</b> Legend Points</span>
        <span><b>${Number(squad.raids)||0}</b> Raids</span>
        <span><b>${Number(squad.shills)||0}</b> Shills</span>
      </div>
      <div class="squad-metrics secondary">
        <span><b>${money(squad.banked_usd)}</b> Banked</span>
        <span><b>$${(Number(squad.volume_usd)||0).toFixed(2)}</b> Volume</span>
        <span><b>${Number(squad.trades)||0}</b> Trades</span>
      </div>
      ${mine ? `<div class="squad-actions">
        <button type="button" data-squad-save>💾 Save Squad Card</button>
        <button type="button" data-squad-share>↗ Share Squad</button>
        ${squad.my_role === "owner" ? "" : '<button type="button" class="ghost" data-squad-leave>Leave Squad</button>'}
      </div>` : `<div class="squad-actions"><button type="button" data-squad-join="${esc(squad.slug)}">Join ${esc(squad.name)}</button></div>`}
    </article>`;
  }

  function memberRows(squad) {
    const rows = (squad.member_rows || []).slice(0, 20);
    if (!rows.length) return '<div class="panel empty">No Squad members yet.</div>';
    return `<div class="worldz-squad-members">${rows.map((member, index) => `<div class="squad-member">
      <span class="rank">#${index + 1}</span>
      <span class="who"><b>${esc(member.display_name)}</b><small>${esc(member.role)} • ${Number(member.raids)||0} Raids • ${Number(member.shills)||0} Shills</small></span>
      <span class="score"><b>${money(member.pnl_usd)}</b><small>${Number(member.points)||0} LP</small></span>
    </div>`).join("")}</div>`;
  }

  function render() {
    const data = state.data;
    if (!data) return;
    if (data.squad) {
      root.innerHTML = `
        <section class="panel worldz-squads-shell">
          <div class="squad-head"><div><p class="eyebrow">WORLDZ SQUADS™</p><h3>Trade. Raid. Shill. Build Together.</h3></div>${periods()}</div>
          ${squadCard(data.squad, true)}
          <div class="squad-subhead"><h3>Squad Members</h3><span>Ranked by verified PNL, then activity.</span></div>
          ${memberRows(data.squad)}
          <p class="squad-truth">Worldz only shows trading PNL when a trusted trade indexer has supplied verified performance data. Raids, ShillPoints and Legend Points remain separately auditable.</p>
        </section>`;
    } else {
      root.innerHTML = `
        <section class="panel worldz-squads-shell">
          <div class="squad-head"><div><p class="eyebrow">WORLDZ SQUADS™</p><h3>Build Your Squad</h3><p>One active Squad per Legend. Compete across trading performance and verified Worldz activity.</p></div>${periods()}</div>
          <form id="worldz-squad-create" class="squad-create">
            <input name="name" required minlength="3" maxlength="48" placeholder="Squad name">
            <button type="submit">Create Squad</button>
          </form>
          <div class="squad-subhead"><h3>Open Squads</h3><span>Join instantly.</span></div>
          <div class="worldz-squad-grid">${(data.discover || []).map((squad) => squadCard(squad, false)).join("") || '<div class="panel empty">No open Squads yet.</div>'}</div>
        </section>`;
    }
  }

  async function load(period = state.period) {
    state.period = period;
    root.innerHTML = '<div class="panel empty">Loading Worldz Squads…</div>';
    try {
      state.data = await request(`/api/mini/squads/me?period=${encodeURIComponent(period)}`);
      render();
    } catch (error) {
      root.innerHTML = `<div class="panel empty">Worldz Squads unavailable: ${esc(error.message)}</div>`;
    }
  }

  function shareUrl() {
    const squad = state.data?.squad;
    if (!squad) return state.data?.share_base_url || "https://launchpad.cryptoworldz.xyz/squads/";
    return `${state.data.share_base_url}?s=${encodeURIComponent(squad.slug)}&period=${encodeURIComponent(state.period)}`;
  }

  function buildCanvas() {
    const squad = state.data?.squad;
    if (!squad) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, "#140622");
    gradient.addColorStop(.45, "#3d0d69");
    gradient.addColorStop(1, "#040208");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(55, 70, 970, 1210);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px sans-serif";
    ctx.fillText("WORLDZ SQUADS™", 90, 140);
    ctx.font = "900 92px sans-serif";
    ctx.fillText(String(squad.name).slice(0, 18), 90, 285);
    ctx.fillStyle = Number(squad.pnl_usd) >= 0 ? "#64ef9c" : "#ff778f";
    ctx.font = "900 118px sans-serif";
    ctx.fillText(money(squad.pnl_usd), 90, 500);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 48px sans-serif";
    ctx.fillText(`Squad PNL • ${state.period}`, 90, 575);
    ctx.font = "700 44px sans-serif";
    ctx.fillText(`Banked: ${money(squad.banked_usd)}`, 90, 700);
    ctx.fillText(`Legend Points: ${Number(squad.points)||0}`, 90, 780);
    ctx.fillText(`Raids: ${Number(squad.raids)||0}   Shills: ${Number(squad.shills)||0}`, 90, 860);
    ctx.fillText(`Members: ${Number(squad.members)||0}`, 90, 940);
    ctx.fillStyle = "#d8b6ff";
    ctx.font = "700 34px sans-serif";
    ctx.fillText("Trade • Raid • Shill • Build Together", 90, 1090);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 42px sans-serif";
    ctx.fillText("WORLDZ 🌐 — A BETTER WORLD 🌏", 90, 1190);
    ctx.fillStyle = "#bba8c7";
    ctx.font = "500 25px sans-serif";
    ctx.fillText("Trading PNL is shown only from verified Worldz performance indexing.", 90, 1245);
    return canvas;
  }

  async function saveCard() {
    const canvas = buildCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${state.data.squad.slug}-worldz-squad-${state.period}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function shareCard() {
    const url = shareUrl();
    const squad = state.data?.squad;
    if (!squad) return;
    const text = `${squad.name} • Worldz Squads™ • ${state.period} PNL ${money(squad.pnl_usd)} • ${Number(squad.points)||0} LP`;
    const canvas = buildCanvas();
    if (navigator.share && canvas) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const file = blob ? new File([blob], `${squad.slug}-worldz-squad.png`, { type:"image/png" }) : null;
      try {
        const payload = { title: `${squad.name} • Worldz Squads`, text, url };
        if (file && navigator.canShare?.({ files:[file] })) payload.files = [file];
        await navigator.share(payload);
        return;
      } catch {}
    }
    await navigator.clipboard?.writeText(`${text}\n${url}`);
    notify("Squad share link copied.");
  }

  root.addEventListener("click", async (event) => {
    const period = event.target.closest("[data-squad-period]")?.dataset.squadPeriod;
    if (period) return load(period);
    const join = event.target.closest("[data-squad-join]")?.dataset.squadJoin;
    if (join) {
      try { await request(`/api/mini/squads/${encodeURIComponent(join)}/join`, { method:"POST", body:"{}" }); await load(); }
      catch (error) { notify(`Could not join Squad: ${error.message}`); }
      return;
    }
    if (event.target.closest("[data-squad-leave]")) {
      try { await request("/api/mini/squads/leave", { method:"POST", body:"{}" }); await load(); }
      catch (error) { notify(`Could not leave Squad: ${error.message}`); }
      return;
    }
    if (event.target.closest("[data-squad-save]")) return saveCard();
    if (event.target.closest("[data-squad-share]")) return shareCard();
  });

  root.addEventListener("submit", async (event) => {
    if (event.target.id !== "worldz-squad-create") return;
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await request("/api/mini/squads", { method:"POST", body:JSON.stringify({ name:form.get("name") }) });
      await load();
    } catch (error) {
      notify(`Could not create Squad: ${error.message}`);
    }
  });

  window.addEventListener("worldz:miniapp-ready", () => load());
  document.addEventListener("DOMContentLoaded", () => {
    if (tg?.initData) load();
  });
})();