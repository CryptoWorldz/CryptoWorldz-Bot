require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.log("BOT_TOKEN not found.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🌍 Welcome to CryptoWorldz!\n\nThe CryptoWorldz Bot is now online. 🚀"
  );
});

console.log("CryptoWorldz Bot is running...");
