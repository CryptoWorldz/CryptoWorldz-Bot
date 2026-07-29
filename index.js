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
console.log("CryptoWorldz Bot is running...");
