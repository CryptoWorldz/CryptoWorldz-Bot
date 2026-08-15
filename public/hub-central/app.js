(() => {
  "use strict";

  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  const initData = tg?.initData || "";
  const headers = () => ({ "content-type": "application/json", "x-telegram-init-data": initData });
  const $ = (id) => document.getElementById(id);
  const ownerState = $("ownerState");
  const hostingerState = $("hostingerState");
  const openaiState = $("openaiState");
  const diagnosticOutput = $("diagnosticOutput");
  const chatOutput = $("chatOutput");
  const proposalList = $("proposalList");

  function state(el, text, ok) {
    el.textContent = text;
    el.classList.remove("ok", "bad");
    el.classList.add(ok ? "ok" : "bad");
  }

  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({ ok: false, error: `http_${response.status}` }));
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.error || `http_${response.status}`);
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function pretty(value) {
    return JSON.stringify(value, null, 2);
  }

  async function loadStatus() {
    try {
      const payload = await api("/api/hub-central/status");
      state(ownerState, "VERIFIED", true);
      state(hostingerState, payload.hostinger_api_configured ? "CONNECTED" : "TOKEN REQUIRED", payload.hostinger_api_configured);
      state(openaiState, payload.openai_api_configured ? "CONNECTED" : "KEY REQUIRED", payload.openai_api_configured);
    } catch (error) {
      state(ownerState, initData ? "NOT AUTHORISED" : "OPEN VIA COMMAND CENTRE", false);
      state(hostingerState, "LOCKED", false);
      state(openaiState, "LOCKED", false);
    }
  }

  async function diagnose() {
    const domain = $("domainInput").value.trim();
    diagnosticOutput.textContent = `Diagnosing ${domain}…`;
    try {
      let payload;
      try { payload = await api(`/api/hub-central/hostinger/dns/${encodeURIComponent(domain)}`); }
      catch (error) {
        if (error.message !== "hostinger_api_not_configured") throw error;
        payload = await api(`/api/hub-central/public-dns/${encodeURIComponent(domain)}`);
      }
      diagnosticOutput.textContent = pretty(payload);
    } catch (error) {
      diagnosticOutput.textContent = pretty(error.payload || { error: error.message });
    }
  }

  async function loadWebsites() {
    diagnosticOutput.textContent = "Loading Hostinger websites…";
    try { diagnosticOutput.textContent = pretty(await api("/api/hub-central/hostinger/websites")); }
    catch (error) { diagnosticOutput.textContent = pretty(error.payload || { error: error.message }); }
  }

  function renderProposals(proposals) {
    proposalList.innerHTML = "";
    for (const proposal of proposals || []) {
      const card = document.createElement("article");
      card.className = "proposal";
      const title = document.createElement("h3");
      title.textContent = proposal.action.replaceAll("_", " ").toUpperCase();
      const data = document.createElement("pre");
      data.textContent = pretty(proposal.arguments);
      const actions = document.createElement("div");
      actions.className = "proposal-actions";
      const approve = document.createElement("button");
      approve.className = "approve";
      approve.textContent = proposal.action === "inspect_domain" ? "Run Diagnostic" : "Approve & Execute";
      approve.addEventListener("click", () => executeProposal(proposal, approve));
      actions.appendChild(approve);
      card.append(title, data, actions);
      proposalList.appendChild(card);
    }
  }

  async function executeProposal(proposal, button) {
    button.disabled = true;
    const a = proposal.arguments || {};
    try {
      let payload;
      if (proposal.action === "inspect_domain") {
        payload = await api(`/api/hub-central/hostinger/dns/${encodeURIComponent(a.domain)}`);
      } else if (proposal.action === "set_a_record") {
        payload = await api(`/api/hub-central/hostinger/dns/${encodeURIComponent(a.domain)}/a`, {
          method: "POST",
          body: JSON.stringify({ name: a.name || "@", ip: a.ip, ttl: a.ttl || 14400, confirmation: "APPROVE HOSTINGER WRITE" })
        });
      } else if (proposal.action === "create_subdomain") {
        payload = await api("/api/hub-central/hostinger/subdomains", {
          method: "POST",
          body: JSON.stringify({ domain: a.domain, subdomain: a.subdomain, directory: a.directory || undefined, confirmation: "APPROVE HOSTINGER WRITE" })
        });
      } else if (proposal.action === "clear_cache") {
        payload = await api("/api/hub-central/hostinger/cache/clear", {
          method: "POST",
          body: JSON.stringify({ domain: a.domain, confirmation: "APPROVE HOSTINGER WRITE" })
        });
      } else {
        throw new Error("unsupported_proposal");
      }
      chatOutput.textContent = pretty(payload);
      button.textContent = "Completed ✅";
    } catch (error) {
      chatOutput.textContent = pretty(error.payload || { error: error.message });
      button.disabled = false;
      button.textContent = "Retry";
    }
  }

  async function sendChat() {
    const message = $("chatInput").value.trim();
    if (!message) return;
    $("sendChat").disabled = true;
    chatOutput.textContent = "OneWorldz AI is working…";
    proposalList.innerHTML = "";
    try {
      const payload = await api("/api/hub-central/chat", { method: "POST", body: JSON.stringify({ message }) });
      chatOutput.textContent = payload.text || (payload.proposals?.length ? "Action proposal ready for owner approval." : "No action proposed.");
      renderProposals(payload.proposals);
    } catch (error) {
      chatOutput.textContent = pretty(error.payload || { error: error.message });
    } finally {
      $("sendChat").disabled = false;
    }
  }

  $("diagnoseDomain").addEventListener("click", diagnose);
  $("loadWebsites").addEventListener("click", loadWebsites);
  $("sendChat").addEventListener("click", sendChat);
  $("chatInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendChat(); }
  });

  loadStatus();
})();