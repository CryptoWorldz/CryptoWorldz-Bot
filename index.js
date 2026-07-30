require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const supabase = require("./db");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("BOT_TOKEN not found.");
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error("Supabase environment variables are missing.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

function isValidSolanaAddress(address) {
  if (typeof address !== "string") {
    return false;
  }

  const trimmed = address.trim();

  // Solana public keys use Base58 and are normally 32–44 characters.
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
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

Welcome to the CryptoWorldz Legend Bot.

🌍 One World • One Mission • One SolFam

🚀 Raaiiidd Missions
🏆 Leaderboards
👛 Wallet Registration
🎁 Community Rewards

Use /profile to view your Legend profile.
Use /help to see all commands.

Together We Raaiiidd • Together We Grow 💜
`;

    await bot.sendMessage(msg.chat.id, welcomeMessage);
  } catch {
    await bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't create your Legend profile. Please try again shortly."
    );
  }
});

bot.onText(/^\/register(?:@\w+)?$/, async (msg) => {
  try {
    const result = await registerUser(msg);

    if (result.created) {
      return bot.sendMessage(
        msg.chat.id,
        "🎉 Registration complete!\n\nWelcome to the CryptoWorldz Legend Bot.\n\nUse /wallet YOUR_PUBLIC_WALLET to save your Solana wallet."
      );
    }

    return bot.sendMessage(
      msg.chat.id,
      "✅ You are already registered!\n\nYour profile details have been refreshed."
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

    const profileMessage = `
🏆 CryptoWorldz Legend Profile

👤 ${user.first_name || "Legend"}
⭐ Points: ${user.points || 0}
🚀 Raaiiidds: ${user.raids || 0}
👛 Wallet: ${user.wallet || "Not Set"}

🎖 Rank: ${getRank(user.points || 0)}
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
    const walletAddress =
      match && match[1] ? match[1].trim() : "";

    const user = await getUser(telegramId);

    if (!user) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ You are not registered.\n\nUse /register first."
      );
    }

    if (!walletAddress) {
      if (user.wallet) {
        return bot.sendMessage(
          msg.chat.id,
          `👛 Your saved wallet:\n\n${user.wallet}\n\nTo update it, use:\n/wallet YOUR_PUBLIC_WALLET`
        );
      }

      return bot.sendMessage(
        msg.chat.id,
        "👛 No wallet saved yet.\n\nUse:\n/wallet YOUR_PUBLIC_WALLET\n\n⚠️ Never send your seed phrase or private key."
      );
    }

    if (!isValidSolanaAddress(walletAddress)) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ That does not look like a valid Solana public wallet address.\n\nOnly send your public wallet address.\nNever send a seed phrase or private key."
      );
    }

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

    return bot.sendMessage(
      msg.chat.id,
      `✅ Wallet saved successfully!\n\n👛 ${walletAddress}\n\nUse /profile to view your updated Legend profile.`
    );
  } catch {
    return bot.sendMessage(
      msg.chat.id,
      "❌ I couldn't save your wallet. Please try again shortly."
    );
  }
});

bot.onText(/^\/help(?:@\w+)?$/, (msg) => {
  const helpMessage = `
🤖💜 CryptoWorldz Legend Bot Commands

/start - Open the welcome message
/register - Register your Legend profile
/profile - View your profile
/wallet - View your saved wallet
/wallet ADDRESS - Save your public Solana wallet
/raaiiidd - View the current Raaiiidd mission
/leaderboard - View team rankings
/alerts - View launch alerts

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

Together We Raaiiidd • Together We Grow 💜
`;

  bot.sendMessage(msg.chat.id, raidMessage);
});

bot.on("polling_error", (error) => {
  console.error("Telegram polling error:", error.message);
});

console.log("CryptoWorldz Bot is running...");
