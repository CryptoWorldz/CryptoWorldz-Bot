const { createRateLimiter } = require('./core');

const BROADCAST_PATTERN = /^\/broadcast(?:@\w+)?(?:\s+([\s\S]+))?$/;
const CANCEL_PATTERN = /^\/cancelbroadcast(?:@\w+)?$/;
const CONFIRM_PATTERN = /^\/confirmbroadcast(?:@\w+)?$/;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function registerScopedBroadcastHandlers({ bot, repository, config }) {
  bot.removeTextListener(BROADCAST_PATTERN);
  bot.removeTextListener(CANCEL_PATTERN);
  bot.removeTextListener(CONFIRM_PATTERN);

  const pending = new Map();
  const allowDraft = createRateLimiter({ maxEvents: 2, intervalMs: 60000 });
  const send = (chatId, text) => bot.sendMessage(chatId, text);

  async function allowed(msg) {
    const access = await repository.getAdminAccess(
      msg.from.id,
      config.adminTelegramIds,
      config.ownerTelegramId
    );
    return access.authorized &&
      access.role !== 'grace_manager' &&
      access.permissions.includes('communication.broadcast');
  }

  const deny = (msg) => send(
    msg.chat.id,
    '⛔ Direct Zed broadcasts require Admin or Executive communication authority. Grace Controllers may publish only through Grace’s approval workflow.'
  );

  bot.onText(BROADCAST_PATTERN, async (msg, match) => {
    if (!(await allowed(msg))) return deny(msg);
    const message = String(match?.[1] || '').trim();
    if (!message) return send(msg.chat.id, '❌ Use: /broadcast Your message here');
    if (message.length > 4096) return send(msg.chat.id, '❌ Broadcasts must be 4096 characters or fewer.');
    if (!allowDraft(String(msg.from.id))) {
      return send(msg.chat.id, '⚠️ Broadcast rate limit reached. Please wait one minute.');
    }
    pending.set(msg.from.id, { message, createdAt: Date.now() });
    return send(
      msg.chat.id,
      `📢 Broadcast draft ready (${message.length} characters).\n\nUse /confirmbroadcast to send or /cancelbroadcast to cancel.`
    );
  });

  bot.onText(CANCEL_PATTERN, async (msg) => {
    if (!(await allowed(msg))) return deny(msg);
    pending.delete(msg.from.id);
    return send(msg.chat.id, '✅ Broadcast cancelled.');
  });

  bot.onText(CONFIRM_PATTERN, async (msg) => {
    if (!(await allowed(msg))) return deny(msg);
    const draft = pending.get(msg.from.id);
    if (!draft || Date.now() - draft.createdAt > 10 * 60 * 1000) {
      pending.delete(msg.from.id);
      return send(msg.chat.id, '❌ No active broadcast draft. Use /broadcast first.');
    }

    pending.delete(msg.from.id);
    try {
      const recipients = new Set((await repository.listRegisteredTelegramIds()).map(String));
      for (const chatId of config.allowedChatIds) recipients.add(String(chatId));
      let sent = 0;
      let failed = 0;
      for (const recipient of recipients) {
        try {
          await send(recipient, draft.message);
          sent += 1;
        } catch {
          failed += 1;
        }
        await wait(50);
      }
      return send(
        msg.chat.id,
        `📢 Broadcast complete.\n\n✅ Sent: ${sent}\n❌ Failed: ${failed}\n👥 Total: ${recipients.size}`
      );
    } catch (error) {
      console.error('Scoped broadcast failed', { name: error?.name || 'Error' });
      return send(msg.chat.id, '❌ The broadcast could not be completed.');
    }
  });
}

module.exports = {
  BROADCAST_PATTERN,
  CANCEL_PATTERN,
  CONFIRM_PATTERN,
  registerScopedBroadcastHandlers
};
