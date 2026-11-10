const bot = require("./src/bot");
const { startNotifier } = require("./src/services/notifier");

// MUHIM: Telegraf 4 da `await bot.launch()` bot to'xtaguncha tugamaydi,
// shuning uchun xabar yuboruvchini launch'dan OLDIN ishga tushiramiz.
const timer = startNotifier(bot);

bot
  .launch(() => console.log("🕌 O‘zbekiston Masjidlari bot ishga tushdi!"))
  .catch((error) => {
    console.error("Botni ishga tushirishda xato:", error);
    process.exit(1);
  });

function shutdown(signal) {
  clearInterval(timer);
  bot.stop(signal);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
