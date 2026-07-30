require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const supabase = require("./db");

const app = express();

app.get("/", (req, res) => {
  res.send("CryptoWorldz Zed Bot is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

const token = process.env.BOT_TOKEN;

if (!token) {
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

const bot = new TelegramBot(token, { polling: true });
const pendingWalletRegistration = new Set();

function decodeBase58(value) {
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];

  for (const character of value) {
    const alphabetIndex = alphabet.indexOf(character);

    if (alphabetIndex === -1) {
      return null;
    }

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

  for (
    let index = 0;
    index < value.length - 1 && value[index] === "1";
    index += 1
  ) {
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

function isValidSolanaAddress(address) {
  if (typeof address !== "string") {
    return false;
  }

  const trimmed = address.trim();

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return false;
  }

  const decoded = decodeBase58(trimmed);
  return decoded !== null && decoded.length === 32;
}

function shortenWallet(address) {
  if (!address) {
    return "Not Set";
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

async function registerUser(msg) {
  const telegramId = msg.from.id;
  const username = msg.from.username || "";
  const firstName = msg.from.first_name || "Legend";

  const { data: existingUser, error: readError } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (readError) {
    console.error("Supabase user lookup error:", readError.message);
    throw readError;
  }

  if (existingUser) {
    const { error: updateError } = await supabase
      .from("users")
      .update({
        username,
        first_name: firstName,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId);

    if (updateError) {
      console.error("Supabase profile update error:", updateError.message);
      throw updateError;
    }

    return {
      user: {
        ...existingUser,
        username,
        first_name: firstName
      },
      created: false
    };
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      wallet: null,
      points: 0,
      raids: 0
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("Supabase registration error:", insertError.message);
    throw insertError;
  }

  return {
    user: newUser,
    created: true
  };
}

async function getUser(telegramId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("Supabase user fetch error:", error.message);
    throw error;
  }

  return data;
}

async function saveWallet(telegramId, walletAddress) {
  const { error } = await supabase
    .from("users")
    .update({
      wallet: walletAddress,
      updated_at: new Date().toISOString()
    })
    .eq("telegram_id", telegramId);

  if (error) {
    console.error("Supabase wallet update error:", error.message);
    throw error;
  }
}

async function addLegendPoints(telegramId, amount) {
  const user = await getUser(telegramId);

  if (!user) {
    return null;
  }

  const currentPoints = Number(user.points) || 0;
  const newPoints = currentPoints + amount;

  const { data, error } = await supabase
    .from("users")
    .update({
      points: newPoints,
      updated_at: new Date().toISOString()
    })
    .eq("telegram_id", telegramId)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase points update error:", error.message);
    throw error;
  }

  return data;
}

function isSameUtcDay(dateValue, now = new Date()) {
  if (!dateValue) {
    return false;
  }

  const savedDate = new Date(`${dateValue}T00:00:00.000Z`);

  return (
    savedDate.getUTCFullYear() === now.getUTCFullYear() &&
    savedDate.getUTCMonth() === now.getUTCMonth() &&
    savedDate.getUTCDate() === now.getUTCDate()
  );
}

function getRank(points) {
  if (points >= 5000) return "Founding Legend";
  if (points >= 2000) return "Legend";
  if (points >= 1000) return "Hero";
  if (points >= 500) return "Guardian";
  if (points >= 100) return "Raider";
  return "Recruit";
}

bot.onText(/^\/start(?:@\w+)?$/, async (msg) => {
  try {
    await registerUser(msg);

    const welcomeMessage = `
🤖💜 Hello ${msg.from.first_name || "Legend"}!

I'm Zed — your guide to CryptoWorldz Command.

🚀 Raaiiidd Missions
🏆 Leaderboards & Rewards
👛 Wallet Registration
🗳️ Governance & Voting
💰 Treasury Transparency
🎁 Airdrops & Events

Use /profile to view your Legend Profile.
Use /help to open the Command Menu.

🌍 One World • One Mission • One CryptoWorldz
`;

    await bot.sendMessage(msg.chat.id, welcomeMessage);
  } catch {
    await bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't create your Legend Profile. Please try again shortly."
    );
  }
});

bot.onText(/^\/register(?:@\w+)?$/, async (msg) => {
  try {
    const result = await registerUser(msg);

    if (result.created) {
      return bot.sendMessage(
        msg.chat.id,
        "🎉 Registration complete!\n\nWelcome to CryptoWorldz Command.\n\nUse /wallet to connect your public Solana wallet."
      );
    }

    return bot.sendMessage(
      msg.chat.id,
      "✅ You are already registered!\n\nYour Legend Profile has been refreshed."
    );
  } catch {
    return bot.sendMessage(
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
        "❌ You are not registered.\n\nUse /register first."
      );
    }

    const walletStatus = user.wallet
      ? `Connected ✅\n${shortenWallet(user.wallet)}`
      : "Not Set";

    const profileMessage = `
🏆 CryptoWorldz Legend Profile

👤 ${user.first_name || "Legend"}
⭐ Legend Points: ${user.points || 0}
🚀 Raaiiidds: ${user.raids || 0}
🎖 Rank: ${getRank(user.points || 0)}

👛 Wallet
${walletStatus}
`;

    return bot.sendMessage(msg.chat.id, profileMessage);
  } catch {
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't load your profile. Please try again shortly."
    );
  }
});

bot.onText(/^\/wallet(?:@\w+)?(?:\s+(.+))?$/, async (msg, match) => {
  try {
    const telegramId = msg.from.id;
    const suppliedWallet = match && match[1] ? match[1].trim() : "";
    const user = await getUser(telegramId);

    if (!user) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered.\n\nUse /register first."
      );
    }

    if (!suppliedWallet) {
      pendingWalletRegistration.add(telegramId);

      const currentWallet = user.wallet
        ? `\n\nCurrent wallet: ${shortenWallet(user.wallet)}`
        : "";

      return bot.sendMessage(
        msg.chat.id,
        `👛 Wallet Registration${currentWallet}\n\nSend your public Solana wallet address in your next message.\n\n⚠️ Never send a seed phrase or private key.\n\nUse /cancel to stop.`
      );
    }

    if (!isValidSolanaAddress(suppliedWallet)) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ That isn't a valid Solana public wallet address.\n\nCheck the address and try again.\nNever send a seed phrase or private key."
      );
    }

    await saveWallet(telegramId, suppliedWallet);
    pendingWalletRegistration.delete(telegramId);

    return bot.sendMessage(
      msg.chat.id,
      `✅ Wallet Connected!\n\n👛 ${shortenWallet(suppliedWallet)}\n\nYour public wallet has been linked to your Legend Profile.\nUse /profile to view your details.`
    );
  } catch {
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't save your wallet. Please try again shortly."
    );
  }
});

bot.onText(/^\/cancel(?:@\w+)?$/, (msg) => {
  if (pendingWalletRegistration.delete(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, "✅ Wallet registration cancelled.");
  }

  return bot.sendMessage(msg.chat.id, "There is nothing to cancel.");
});

bot.on("message", async (msg) => {
  if (
    !msg.text ||
    msg.text.startsWith("/") ||
    !pendingWalletRegistration.has(msg.from.id)
  ) {
    return;
  }

  const walletAddress = msg.text.trim();

  if (!isValidSolanaAddress(walletAddress)) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ That isn't a valid Solana public wallet address.\n\nPlease check it and send it again, or use /cancel."
    );
  }

  try {
    const user = await getUser(msg.from.id);

    if (!user) {
      pendingWalletRegistration.delete(msg.from.id);
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered.\n\nUse /register first."
      );
    }

    await saveWallet(msg.from.id, walletAddress);
    pendingWalletRegistration.delete(msg.from.id);

    return bot.sendMessage(
      msg.chat.id,
      `✅ Wallet Connected!\n\n👛 ${shortenWallet(walletAddress)}\n\nYour public wallet has been linked to your Legend Profile.\nUse /profile to view your details.`
    );
  } catch {
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't save your wallet. Please try again shortly."
    );
  }
});

bot.onText(/^\/points(?:@\w+)?$/, async (msg) => {
  try {
    const user = await getUser(msg.from.id);

    if (!user) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered.\n\nUse /register first."
      );
    }

    const points = Number(user.points) || 0;

    return bot.sendMessage(
      msg.chat.id,
      `⭐ Legend Points\n\nYou currently have ${points} Legend Points.\n🎖 Rank: ${getRank(points)}`
    );
  } catch {
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't load your Legend Points. Please try again shortly."
    );
  }
});

bot.onText(/^\/checkin(?:@\w+)?$/, async (msg) => {
  try {
    const user = await getUser(msg.from.id);

    if (!user) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered.\n\nUse /register first."
      );
    }

    if (isSameUtcDay(user.last_checkin)) {
      return bot.sendMessage(
        msg.chat.id,
        `✅ You have already checked in today.\n\n⭐ Legend Points: ${Number(user.points) || 0}\nCome back tomorrow for another reward.`
      );
    }

    const updatedUser = await addLegendPoints(msg.from.id, 2);
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("users")
      .update({
        last_checkin: today,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", msg.from.id);

    if (error) {
      console.error("Supabase check-in update error:", error.message);
      throw error;
    }

    return bot.sendMessage(
      msg.chat.id,
      `✅ Daily Check-In Complete!\n\n⭐ +2 Legend Points\n🏆 Total: ${Number(updatedUser.points) || 0}\n🎖 Rank: ${getRank(Number(updatedUser.points) || 0)}`
    );
  } catch {
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't complete your check-in. Please try again shortly."
    );
  }
});

bot.onText(/^\/leaderboard(?:@\w+)?$/, async (msg) => {
  try {
    const { data: leaders, error } = await supabase
      .from("users")
      .select("first_name, username, points")
      .order("points", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Supabase leaderboard error:", error.message);
      throw error;
    }

    if (!leaders || leaders.length === 0) {
      return bot.sendMessage(
        msg.chat.id,
        "🏆 CryptoWorldz Leaderboard\n\nNo Legends have joined yet."
      );
    }

    const medals = ["🥇", "🥈", "🥉"];
    const rows = leaders.map((leader, index) => {
      const name =
        leader.first_name ||
        (leader.username ? `@${leader.username}` : "Legend");
      const marker = medals[index] || `${index + 1}.`;
      return `${marker} ${name} — ${Number(leader.points) || 0} LP`;
    });

    return bot.sendMessage(
      msg.chat.id,
      `🏆 CryptoWorldz Leaderboard\n\n${rows.join("\n")}\n\n⭐ LP = Legend Points`
    );
  } catch {
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't load the leaderboard. Please try again shortly."
    );
  }
});

bot.onText(/^\/help(?:@\w+)?$/, (msg) => {
  const helpMessage = `
🤖💜 Zed — CryptoWorldz Command

/start — Open CryptoWorldz Command
/register — Register your Legend Profile
/profile — View your Legend Profile
/points — View your Legend Points
/checkin — Collect your daily points
/leaderboard — View team rankings
/wallet — Connect or update your public Solana wallet
/cancel — Cancel wallet registration
/raaiiidd — View the current Raaiiidd Mission
/alerts — View launch alerts

⚠️ Never provide a private key or seed phrase.
`;

  bot.sendMessage(msg.chat.id, helpMessage);
});

bot.onText(/^\/(?:raid|raaiiidd)(?:@\w+)?$/, (msg) => {
  const raidMessage = `
🚀💜 CryptoWorldz Raaiiidd Mission

🎯 Today's Mission

❤️ Like
🔁 Repost
💬 Comment
⭐ Bookmark

🔗 Target:
https://x.com/CryptoWorldzX

Reply with ✅ DONE once completed.
`;

  bot.sendMessage(msg.chat.id, raidMessage);
});

bot.on("polling_error", (error) => {
  console.error("Telegram polling error:", error.message);
});

console.log("CryptoWorldz Zed Bot is running...");
      
