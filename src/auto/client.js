function createAutoClient(config) {
  const baseUrl = String(config.autoServiceUrl || "").replace(/\/$/, "");
  const token = String(config.autoInternalToken || "");
  const ownerId = String(config.ownerTelegramId || "");

  function configured() {
    return Boolean(baseUrl && token && ownerId);
  }

  async function request(path, options = {}) {
    if (!configured()) {
      const error = new Error("Auto service is not configured.");
      error.code = "AUTO_NOT_CONFIGURED";
      throw error;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: options.method || "GET",
        headers: {
          "content-type": "application/json",
          "x-auto-internal-token": token,
          "x-owner-telegram-id": ownerId
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
    emergencyStop: () => request("/internal/emergency-stop", { method: "POST", body: {} }),
    pause: () => request("/internal/pause", { method: "POST", body: {} }),
    resumeSimulation: () => request("/internal/resume-simulation", { method: "POST", body: {} }),
    simulate: (body) => request("/internal/simulate", { method: "POST", body }),
    status: () => request("/internal/status")
  };
}

module.exports = { createAutoClient };
