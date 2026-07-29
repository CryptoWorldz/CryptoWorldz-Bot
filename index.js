require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

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

console.log("CryptoWorldz Bot is running...");
