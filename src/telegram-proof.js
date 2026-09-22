let lastStartReply = null;

function recordStartReply({ inputMessageId, chatId, chatType, replyMessageId }) {
  lastStartReply = Object.freeze({
    at: new Date().toISOString(),
    input_message_id: Number(inputMessageId) || null,
    chat_id: String(chatId || ""),
    chat_type: String(chatType || ""),
    reply_message_id: Number(replyMessageId) || null
  });
  return lastStartReply;
}

function getLastStartReply() {
  return lastStartReply ? { ...lastStartReply } : null;
}

module.exports = { getLastStartReply, recordStartReply };
