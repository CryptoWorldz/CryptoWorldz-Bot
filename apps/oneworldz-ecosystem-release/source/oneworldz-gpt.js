(() => {
  const API = "https://cryptobotz.cryptoworldz.xyz/api/oneworldz-gpt/chat";
  const hostname = window.location.hostname.toLowerCase();
  const page = hostname.includes("cryptoworldz") ? "cryptoworldz" : hostname.includes("donateworldz") ? "donateworldz" : "oneworldz";
  const cryptoSurface = page === "cryptoworldz";
  const assistantName = cryptoSurface ? "CryptoWorldz GTP" : "OneWorldz GPT";
  const history = [];

  const callout = document.createElement("section");
  callout.className = "oneworldz-gpt-callout";
  callout.id = "oneworldz-gpt";
  callout.innerHTML = `<div class="oneworldz-gpt-reference"><img src="/assets/oneworldz-gpt/oneworldz-gpt.png" alt="${assistantName} reference artwork" loading="lazy" decoding="async"></div><div class="oneworldz-gpt-copy"><small>AI GUIDED SUPPORT • POWERED BY OPENAI</small><h2>${assistantName}</h2><p>${cryptoSurface ? "The same protected OneWorldz GPT system is available inside CryptoWorldz for Worldz navigation, official links, project context and community guidance." : "Ask where to help, what each OneWorldz destination does, how to volunteer, or which approved support pathway fits. Payments stay on the secure DonateWorldz pages — never inside chat."}</p><button type="button" data-gpt-open>Open ${assistantName}</button></div>`;

  const footer = document.querySelector(".site-footer");
  if (footer) footer.before(callout);
  else document.body.append(callout);

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "oneworldz-gpt-launcher";
  launcher.setAttribute("aria-label", `Open ${assistantName}`);
  launcher.innerHTML = `<span class="orb" aria-hidden="true">W</span><span class="label">Ask ${assistantName}</span>`;

  const quickPrompts = cryptoSurface
    ? `<button type="button" data-prompt="Show me the official CryptoWorldz and Worldz links.">Official Worldz</button><button type="button" data-prompt="What is Command Centre Ultimate and what do the five protected roles do?">Command Centre</button><button type="button" data-prompt="What is ImpactBased and where is the official page?">ImpactBased</button><button type="button" data-prompt="How does CryptoWorldz connect to OneWorldz and human impact?">Human impact</button>`
    : `<button type="button" data-prompt="Where can I help?">Where can I help?</button><button type="button" data-prompt="How can I help children in Uganda?">Help in Uganda</button><button type="button" data-prompt="How can I volunteer on the ground?">Volunteer</button><button type="button" data-prompt="What can I learn or research?">Learn & research</button>`;

  const panel = document.createElement("aside");
  panel.className = "oneworldz-gpt-panel";
  panel.setAttribute("data-open", "false");
  panel.setAttribute("aria-label", `${assistantName} assistant`);
  panel.innerHTML = `
    <div class="oneworldz-gpt-head">
      <span class="orb" aria-hidden="true">W</span>
      <span><strong>${assistantName}</strong><small>${cryptoSurface ? "Shared OneWorldz GPT system • Powered by OpenAI" : "AI-guided support • Powered by OpenAI"}</small></span>
      <button class="oneworldz-gpt-close" type="button" aria-label="Close ${assistantName}">×</button>
    </div>
    <div class="oneworldz-gpt-messages" aria-live="polite">
      <div class="oneworldz-gpt-message assistant">${cryptoSurface ? "I can help you navigate CryptoWorldz, the Worldz, Command Centre, ImpactBased and official ecosystem links. I will never ask for wallet secrets, passwords, API keys or payment details." : "I can help you find the right way to support, learn, volunteer or explore OneWorldz. I will never ask for card details, bank details, passwords, API keys or wallet secrets."}</div>
      <div class="oneworldz-gpt-quick">${quickPrompts}</div>
    </div>
    <form class="oneworldz-gpt-form">
      <textarea name="message" aria-label="Message ${assistantName}" placeholder="Ask ${assistantName}…" maxlength="1200" required></textarea>
      <button type="submit">Send</button>
      <p class="oneworldz-gpt-note">Do not enter card, bank, password, API-key, seed-phrase or private-key information.</p>
    </form>`;

  document.body.append(launcher, panel);

  const messages = panel.querySelector(".oneworldz-gpt-messages");
  const form = panel.querySelector("form");
  const input = form.elements.message;
  const send = form.querySelector('button[type="submit"]');

  function setOpen(open) {
    panel.setAttribute("data-open", open ? "true" : "false");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) setTimeout(() => input.focus(), 20);
  }

  function addMessage(role, text) {
    const node = document.createElement("div");
    node.className = `oneworldz-gpt-message ${role}`;
    node.textContent = text;
    messages.append(node);
    messages.scrollTop = messages.scrollHeight;
  }

  function addLinks(items) {
    if (!Array.isArray(items) || !items.length) return;
    const wrap = document.createElement("div");
    wrap.className = "oneworldz-gpt-links";
    for (const item of items) {
      if (!item?.href || !item?.label) continue;
      const link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.label;
      if (new URL(item.href).host !== window.location.host) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      wrap.append(link);
    }
    if (wrap.childElementCount) messages.append(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  async function ask(text) {
    const message = String(text || "").trim();
    if (!message) return;
    setOpen(true);
    addMessage("user", message);
    history.push({ role: "user", content: message });
    input.value = "";
    input.disabled = true;
    send.disabled = true;

    const thinking = document.createElement("div");
    thinking.className = "oneworldz-gpt-message assistant";
    thinking.textContent = "Thinking…";
    messages.append(thinking);
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page,
          message,
          history: history.slice(-4, -1)
        })
      });
      const payload = await response.json().catch(() => ({}));
      thinking.remove();
      if (!response.ok || !payload.ok) {
        const text = payload.error === "openai_api_not_configured"
          ? `${assistantName} is built, but its protected OpenAI API key is not active on the server.`
          : payload.error === "openai_quota_exhausted"
            ? `${assistantName} is temporarily paused because the OpenAI API credit is exhausted. The normal website links still work.`
            : payload.error === "daily_limit_reached"
              ? `${assistantName} has reached its daily public-use safety limit. The normal website links still work.`
              : payload.error === "rate_limited"
                ? "Too many requests from this connection. Try again shortly."
                : `${assistantName} could not answer that request right now.`;
        addMessage("assistant", text);
        return;
      }
      const answer = String(payload.text || `I can help you find the right ${cryptoSurface ? "CryptoWorldz" : "OneWorldz"} pathway.`);
      addMessage("assistant", answer);
      addLinks(payload.suggestions);
      history.push({ role: "assistant", content: answer });
      if (history.length > 6) history.splice(0, history.length - 6);
    } catch {
      thinking.remove();
      addMessage("assistant", `${assistantName} is temporarily unreachable. The normal website links still work.`);
    } finally {
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", () => setOpen(panel.getAttribute("data-open") !== "true"));
  panel.querySelector(".oneworldz-gpt-close").addEventListener("click", () => setOpen(false));
  callout.querySelector("[data-gpt-open]").addEventListener("click", () => setOpen(true));
  panel.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => ask(button.dataset.prompt)));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.getAttribute("data-open") === "true") setOpen(false);
  });
})();
