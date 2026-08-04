function createAutoClient(config) {
  const baseUrl = String(config.autoServiceUrl || "").replace(/\/$/, "");
  const authToken = String(config.autoAuthToken || config.autoInternalToken || "");
  const ownerId = String(config.ownerTelegramId || "");

  function configured() {
    return Boolean(baseUrl && authToken && ownerId);
  }

  async function request(path = "", options = {}) {
    if (!configured()) {
      const error = new Error("Auto service is not configured.");
      error.code = "AUTO_NOT_CONFIGURED";
      throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const method = options.method || "GET";
    const body = options.body === undefined
      ? undefined
      : { ...options.body, telegram_id: Number(ownerId) };

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${authToken}`,
          "x-owner-telegram-id": ownerId
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || `Auto service returned ${response.status}`);
        error.code = payload.error || "AUTO_REQUEST_FAILED";
        error.payload = payload;
        throw error;
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    configured,
    emergencyStop: () => request("/emergency-stop", { method: "POST", body: {} }),
    pause: () => request("/pause", { method: "POST", body: {} }),
    resumeSimulation: () => request("/resume", { method: "POST", body: {} }),
    simulate: (body) => request("/simulate", { method: "POST", body }),
    status: () => request("")
  };
}

module.exports = { createAutoClient };
