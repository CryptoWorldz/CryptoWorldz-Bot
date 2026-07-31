require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const supabase = require("./db");

const app = express();
app.use(express.json({ limit: "32kb" }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;
const ALLOWED_CHAT_IDS = new Set(
  String(process.env.ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not found.");
  process.exit(1);
}

if (
  !process.env.SUPABASE_URL ||
  (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)
) {
  console.error("Supabase environment variables are missing.");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingWalletRegistration = new Set();

function safeTokenMatch(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function audit(event, details = {}) {
  console.log(JSON.stringify({
    type: "admin_api_audit",
    event,
    timestamp: new Date().toISOString(),
    ...details
  }));
}

function decodeBase58(value) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];

  for (const character of value) {
    const alphabetIndex = alphabet.indexOf(character);
    if (alphabetIndex === -1) return null;

    let carry = alphabetIndex;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (let index = 0; index < value.length - 1 && value[index] === "1"; index += 1) {
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

function isValidSolanaAddress(address) {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return false;
  const decoded = decodeBase58(trimmed);
  return decoded !== null && decoded.length === 32;
}

function shortenWallet(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "Not Set";
}

function getRank(points) {
  if (points >= 5000) return "Founding Legend";
  if (points >= 2000) return "Legend";
  if (points >= 1000) return "Hero";
  if (points >= 500) return "Guardian";
  if (points >= 100) return "Raider";
  return "Recruit";
}

async function getUser(telegramId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function registerUser(msg) {
  const telegramId = msg.from.id;
  const username = msg.from.username || "";
  const firstName = msg.from.first_name || "Legend";
  const existing = await getUser(telegramId);

  if (existing) {
    const { error } = await supabase
      .from("users")
      .update({
        username,
        first_name: firstName,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId);

    if (error) throw error;
    return { created: false };
  }

  const { error } = await supabase.from("users").insert({
    telegram_id: telegramId,
    username,
    first_name: firstName,
    wallet: null,
    points: 0,
    raids: 0
  });

  if (error) throw error;
  return { created: true };
}

async function saveWallet(telegramId, wallet) {
  const { error } = await supabase
    .from("users")
    .update({
      wallet,
      updated_at: new Date().toISOString()
    })
    .eq("telegram_id", telegramId);

  if (error) throw error;
}

app.get("/", (req, res) => {
  res.json({ ok: true, service: "CryptoWorldz Zed Bot" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/command", async (req, res) => {
  const requestId = crypto.randomUUID();
  const authHeader = req.get("authorization") || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const suppliedToken = bearerMatch ? bearerMatch[1].trim() : "";

  if (!ADMIN_API_TOKEN || !safeTokenMatch(suppliedToken, ADMIN_API_TOKEN)) {
    audit("auth_failed", { request_id: requestId, ip: req.ip });
    return res.status(401).json({
      ok: false,
      error: "unauthorized",
      request_id: requestId
    });
  }

  const { action, chat_id: chatId, text } = req.body || {};

  if (action !== "send_message") {
    audit("action_rejected", {
      request_id: requestId,
      action: String(action || "")
    });

    return res.status(400).json({
      ok: false,
      error: "unsupported_action",
      request_id: requestId
    });
  }

  const normalizedChatId = String(chatId || "").trim();

  if (!normalizedChatId || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({
      ok: false,
      error: "chat_id_and_text_required",
      request_id: requestId
    });
  }

  if (text.length > 4096) {
    return res.status(400).json({
      ok: false,
      error: "text_too_long",
      request_id: requestId
    });
  }

  if (!ALLOWED_CHAT_IDS.has(normalizedChatId)) {
    audit("chat_rejected", {
      request_id: requestId,
      chat_id: normalizedChatId
    });

    return res.status(403).json({
      ok: false,
      error: "chat_not_allowed",
      request_id: requestId
    });
  }

  try {
    await bot.sendMessage(normalizedChatId, text.trim());

    audit("message_sent", {
      request_id: requestId,
      chat_id: normalizedChatId
    });

    return res.json({
      ok: true,
      request_id: requestId
    });
  } catch (error) {
    console.error("Admin API Telegram send failed", {
      request_id: requestId,
      name: error && error.name ? error.name : "Error"
    });

    audit("message_failed", {
      request_id: requestId,
      chat_id: normalizedChatId
    });

    return res.status(502).json({
      ok: false,
      error: "telegram_send_failed",
      request_id: requestId
    });
  }
});

bot.onText(/^\/start(?:@\w+)?$/, async (msg) => {
  try {
    await registerUser(msg);

    await bot.sendMessage(
      msg.chat.id,
      `🤖💜 Hello ${msg.from.first_name || "Legend"}!

I'm Zed — your guide to CryptoWorldz Command.

🚀 Raaiiidd Missions
🏆 Leaderboards & Rewards
👛 Wallet Registration
🗳️ Governance & Voting
💰 Treasury Transparency
🎁 Airdrops & Events

Use /profile to view your Legend Profile.
Use /help to open the Command Menu.

🌍 One World • One Mission • One CryptoWorldz`
    );
  } catch (error) {
    console.error("Start command failed:", error.message);
    await bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't create your Legend Profile. Please try again shortly."
    );
  }
});

bot.onText(/^\/register(?:@\w+)?$/, async (msg) => {
  try {
    const result = await registerUser(msg);

    await bot.sendMessage(
      msg.chat.id,
      result.created
        ? "🎉 Registration complete!\n\nUse /wallet to connect your public Solana wallet."
        : "✅ You are already registered!\n\nYour Legend Profile has been refreshed."
    );
  } catch (error) {
    console.error("Register command failed:", error.message);
    await bot.sendMessage(
      msg.chat.id,
      "❌ Registration failed. Please try again shortly."
    );
  }
});

bot.onText(/^\/profile(?:@\w+)?$/, async (msg) => {
  try {
    const user = await getUser(msg.from.id);

    if (!user) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered. Use /register first."
      );
    }

    const points = Number(user.points) || 0;

    return bot.sendMessage(
      msg.chat.id,
      `🏆 CryptoWorldz Legend Profile

👤 ${user.first_name || "Legend"}
⭐ Legend Points: ${points}
🚀 Raaiiidds: ${user.raids || 0}
🎖 Rank: ${getRank(points)}

👛 Wallet
${user.wallet ? `Connected ✅\n${shortenWallet(user.wallet)}` : "Not Set"}`
    );
  } catch (error) {
    console.error("Profile command failed:", error.message);
    return bot.sendMessage(msg.chat.id, "❌ I couldn't load your profile.");
  }
});

bot.onText(/^\/wallet(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
  try {
    const user = await getUser(msg.from.id);

    if (!user) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered. Use /register first."
      );
    }

    const supplied = match && match[1] ? match[1].trim() : "";

    if (!supplied) {
      pendingWalletRegistration.add(msg.from.id);

      return bot.sendMessage(
        msg.chat.id,
        "👛 Send your public Solana wallet address in your next message.\n\n⚠️ Never send a seed phrase or private key.\nUse /cancel to stop."
      );
    }

    if (!isValidSolanaAddress(supplied)) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ That isn't a valid Solana public wallet address."
      );
    }

    await saveWallet(msg.from.id, supplied);

    return bot.sendMessage(
      msg.chat.id,
      `✅ Wallet Connected!\n\n👛 ${shortenWallet(supplied)}`
    );
  } catch (error) {
    console.error("Wallet command failed:", error.message);
    return bot.sendMessage(msg.chat.id, "❌ I couldn't save your wallet.");
  }
});

bot.onText(/^\/cancel(?:@\w+)?$/, (msg) => {
  pendingWalletRegistration.delete(msg.from.id);
  bot.sendMessage(msg.chat.id, "✅ Wallet registration cancelled.");
});

bot.on("message", async (msg) => {
  if (
    !msg.text ||
    msg.text.startsWith("/") ||
    !pendingWalletRegistration.has(msg.from.id)
  ) {
    return;
  }

  const wallet = msg.text.trim();

  if (!isValidSolanaAddress(wallet)) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ That isn't a valid Solana public wallet address. Try again or use /cancel."
    );
  }

  try {
    await saveWallet(msg.from.id, wallet);
    pendingWalletRegistration.delete(msg.from.id);

    await bot.sendMessage(
      msg.chat.id,
      `✅ Wallet Connected!\n\n👛 ${shortenWallet(wallet)}`
    );
  } catch (error) {
    console.error("Wallet message save failed:", error.message);
    await bot.sendMessage(msg.chat.id, "❌ I couldn't save your wallet.");
  }
});

bot.onText(/^\/points(?:@\w+)?$/, async (msg) => {
  try {
    const user = await getUser(msg.from.id);

    if (!user) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered. Use /register first."
      );
    }

    const points = Number(user.points) || 0;

    return bot.sendMessage(
      msg.chat.id,
      `⭐ Legend Points

You currently have ${points} Legend Points.
🎖 Rank: ${getRank(points)}`
    );
  } catch (error) {
    console.error("Points command failed:", error.message);
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't load your Legend Points."
    );
  }
});

bot.onText(/^\/leaderboard(?:@\w+)?$/, async (msg) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("first_name,username,points")
      .order("points", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return bot.sendMessage(
        msg.chat.id,
        "🏆 CryptoWorldz Leaderboard\n\nNo Legends have joined yet."
      );
    }

    const rows = data.map(
      (user, index) =>
        `${index + 1}. ${
          user.first_name ||
          (user.username ? `@${user.username}` : "Legend")
        } — ${Number(user.points) || 0} LP`
    );

    return bot.sendMessage(
      msg.chat.id,
      `🏆 CryptoWorldz Leaderboard\n\n${rows.join("\n")}`
    );
  } catch (error) {
    console.error("Leaderboard command failed:", error.message);
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't load the leaderboard."
    );
  }
});

bot.onText(/^\/(?:raid|raaiiidd)(?:@\w+)?$/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🚀💜 CryptoWorldz Raaiiidd Mission\n\n❤️ Like\n🔁 Repost\n💬 Comment\n⭐ Bookmark\n\n🔗 https://x.com/CryptoWorldzX\n\nReply with ✅ DONE once completed."
  );
});

bot.onText(/^\/help(?:@\w+)?$/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤖💜 Zed — CryptoWorldz Command\n\n/start\n/register\n/profile\n/points\n/leaderboard\n/wallet\n/cancel\n/raaiiidd\n\n⚠️ Never provide a private key or seed phrase."
  );
});

bot.on("polling_error", (error) => {
  console.error("Telegram polling error:", error.message);
});

app.listen(PORT, () => {
  console.log(`CryptoWorldz Zed Bot listening on port ${PORT}`);
});
