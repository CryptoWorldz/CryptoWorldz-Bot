require("dotenv").config();
const fs = require("fs");

const DATA_FILE = "data.json";

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
const TelegramBot = require("node-telegram-bot-api");
const supabase = require("./db");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.log("BOT_TOKEN not found.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const welcomeMessage = `
🤖💜 Welcome to CryptoWorldz Legend Bot!

🌍 One World • One Mission • One SolFam

🚀 Raaiiidd Missions
🏆 Leaderboards
👛 Wallet Registration
📢 Launch Alerts
🎁 Community Rewards

Type /help to see available commands.

Together We Raaiiidd • Together We Grow 💜
`;

  bot.sendMessage(msg.chat.id, welcomeMessage);
});
bot.onText(/^\/help(?:@\w+)?$/, (msg) => {
  const helpMessage = `
🤖💜 CryptoWorldz Legend Bot Commands

/start - Open the welcome message
/help - View this command list
/raaiiidd - View the current Raaiiidd mission
/leaderboard - View team rankings
/wallet - Register or view your wallet
/alerts - View launch alerts

More Legend Bot features are coming soon. 🚀
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

Reply with ✅ DONE once you've completed today's Raaiiidd.

Together We Raaiiidd • Together We Grow 💜
`;

  bot.sendMessage(msg.chat.id, raidMessage);
});
bot.onText(/^\/register(?:@\w+)?$/, (msg) => {
  const data = loadData();
  const id = msg.from.id.toString();

  if (!data.users[id]) {
    data.users[id] = {
      username: msg.from.username || "",
      name: msg.from.first_name || "Legend",
      wallet: "",
      points: 0,
      raids: 0
    };

    saveData(data);

    bot.sendMessage(
      msg.chat.id,
      "🎉 Registration complete!\n\nWelcome to the CryptoWorldz Legend Bot.\n\nUse /wallet to save your public wallet."
    );
  } else {
    bot.sendMessage(
      msg.chat.id,
      "✅ You are already registered!"
    );
  }
});
bot.onText(/^\/profile(?:@\w+)?$/, (msg) => {
  const data = loadData();
  const id = msg.from.id.toString();

  if (!data.users[id]) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ You are not registered.\n\nUse /register first."
    );
  }

  const user = data.users[id];

  const profileMessage = `
🏆 CryptoWorldz Legend Profile

👤 ${user.name}
⭐ Points: ${user.points}
🚀 Raaiiidds: ${user.raids}
👛 Wallet: ${user.wallet || "Not Set"}

🎖 Rank: Recruit
`;

  bot.sendMessage(msg.chat.id, profileMessage);
});
console.log("CryptoWorldz Bot is running...");
