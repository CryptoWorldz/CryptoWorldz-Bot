const { estimatePostCost } = require("./core");

function createGraceWorker({ repository, publisher, intervalMs = 60000, logger = console }) {
  let timer = null;
  let running = false;

  async function runOnce() {
    if (running) return { skipped: "already_running" };
    running = true;
    try {
      const settings = await repository.getSettings();
      if (settings.paused || settings.emergency_stop || !settings.posting_enabled) {
        return { skipped: "posting_locked" };
      }

      const targets = await repository.claimDueTargets(10);
      const result = { claimed: targets.length, published: 0, failed: 0, blocked: 0 };

      for (const target of targets) {
        const hasLink = Boolean(String(target.link_url || "").trim());
        const estimatedCost = estimatePostCost(target.platform, hasLink, settings.cost_model || {});
        try {
          const budget = await repository.authorizeSpend(target, estimatedCost);
          if (!budget.ok) {
            await repository.markTargetFailed(
              target.target_id,
              `Auto budget control blocked this post: ${budget.reason}.`,
              { permanent: true }
            );
            await repository.recordAudit("grace_post_budget_blocked", null, {
              target_id: target.target_id,
              account_id: target.account_id,
              reason: budget.reason,
              estimated_cost_usd: estimatedCost,
              spent_usd: budget.spent,
              limit_usd: budget.limit
            });
            result.blocked += 1;
            continue;
          }

          await repository.setEstimatedCost(target.target_id, estimatedCost);
          const published = await publisher.publish(target);
          await repository.markTargetPublished(target.target_id, published.externalPostId, estimatedCost);
          await repository.recordAudit("grace_post_published", null, {
            target_id: target.target_id,
            account_id: target.account_id,
            platform: target.platform,
            external_post_id: published.externalPostId,
            cost_usd: estimatedCost
          });
          result.published += 1;
        } catch (error) {
          await repository.markTargetFailed(target.target_id, error.message, { permanent: error.permanent });
          await repository.recordAudit("grace_post_publish_failed", null, {
            target_id: target.target_id,
            account_id: target.account_id,
            platform: target.platform,
            code: error.code || "UNKNOWN",
            permanent: Boolean(error.permanent)
          });
          result.failed += 1;
          logger.error("Grace publishing target failed", {
            targetId: target.target_id,
            platform: target.platform,
            code: error.code || "UNKNOWN"
          });
        }
      }

      return result;
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) return timer;
    timer = setInterval(() => {
      runOnce().catch((error) => logger.error("Grace worker cycle failed", {
        name: error?.name || "Error",
        message: error?.message || "Unknown error"
      }));
    }, Math.max(15000, Number(intervalMs) || 60000));
    timer.unref();
    return timer;
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  return { runOnce, start, stop };
}

module.exports = { createGraceWorker };
