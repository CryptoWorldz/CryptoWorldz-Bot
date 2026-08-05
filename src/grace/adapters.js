class GracePublishError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "GracePublishError";
    this.code = options.code || "GRACE_PUBLISH_FAILED";
    this.permanent = Boolean(options.permanent);
    this.status = options.status || null;
  }
}

function readCredential(env, reference) {
  const key = String(reference || "").trim();
  if (!/^[A-Z][A-Z0-9_]{4,120}$/.test(key)) {
    throw new GracePublishError("The credential reference is invalid.", {
      code: "INVALID_CREDENTIAL_REFERENCE",
      permanent: true
    });
  }
  const token = String(env[key] || "").trim();
  if (!token) {
    throw new GracePublishError(`Hosting secret ${key} has not been configured.`, {
      code: "MISSING_CREDENTIAL",
      permanent: true
    });
  }
  return token;
}

function composeCaption(target) {
  const caption = String(target.caption || "").trim();
  const link = String(target.link_url || "").trim();
  if (!link || caption.includes(link)) return caption;
  return `${caption}\n\n${link}`.trim();
}

function createGracePublisher(options = {}) {
  const fetchImpl = options.fetchImpl || global.fetch;
  const env = options.env || process.env;
  const tokenProvider = options.tokenProvider;
  if (typeof fetchImpl !== "function") throw new Error("A Fetch API implementation is required.");

  async function resolveToken(target) {
    if (typeof tokenProvider === "function") {
      const oauthToken = await tokenProvider(target);
      if (oauthToken) return oauthToken;
    }
    return readCredential(env, target.credential_secret_ref);
  }

  async function publishToX(target) {
    const token = await resolveToken(target);
    const text = composeCaption(target);
    if (!text) {
      throw new GracePublishError("The X caption is empty.", {
        code: "EMPTY_CAPTION",
        permanent: true
      });
    }

    const payload = { text };
    const mediaIds = Array.isArray(target.media?.x_media_ids)
      ? target.media.x_media_ids.map(String).filter(Boolean).slice(0, 4)
      : [];
    if (mediaIds.length) payload.media = { media_ids: mediaIds };

    const response = await fetchImpl("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok || !responseBody?.data?.id) {
      const detail = responseBody?.detail
        || responseBody?.title
        || responseBody?.errors?.[0]?.detail
        || `X returned HTTP ${response.status}.`;
      const permanent = [400, 401, 403, 404, 422].includes(response.status);
      throw new GracePublishError(detail, {
        code: "X_API_ERROR",
        permanent,
        status: response.status
      });
    }

    return {
      externalPostId: String(responseBody.data.id),
      platform: "x",
      response: responseBody.data
    };
  }

  async function publish(target) {
    switch (target.platform) {
      case "x":
        return publishToX(target);
      case "facebook":
      case "instagram":
      case "youtube":
      case "tiktok":
        throw new GracePublishError(`${target.platform} publishing is prepared but its official app connection is not configured yet.`, {
          code: "PLATFORM_NOT_CONNECTED",
          permanent: true
        });
      default:
        throw new GracePublishError("Unsupported social platform.", {
          code: "UNSUPPORTED_PLATFORM",
          permanent: true
        });
    }
  }

  return { publish };
}

module.exports = { GracePublishError, composeCaption, createGracePublisher, readCredential };
