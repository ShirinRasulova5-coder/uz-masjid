const { timezone, notifyGraceMinutes } = require("../config");
const { getLocalNow } = require("../utils/time");
const { getDuePrayers } = require("./prayerSchedule");
const { getPrayerTimes } = require("./prayerService");
const userStore = require("./userStore");

const PRAYER_NAMES = {
  fajr: "🌅 Bomdod",
  dhuhr: "🕛 Peshin",
  asr: "🌤 Asr",
  maghrib: "🌇 Shom",
  isha: "🌙 Xufton"
};

const timesCache = new Map();
let isChecking = false;

async function checkPrayerNotifications(bot, now = getLocalNow(timezone)) {
  if (isChecking) return;
  isChecking = true;

  try {
    const { date, minutes } = now;

    // Eski kunlarning keshini tozalash
    for (const key of timesCache.keys()) {
      if (!key.startsWith(date)) timesCache.delete(key);
    }

    for (const user of userStore.getUsers()) {
      if (
        user.notificationsEnabled !== true ||
        !Number.isFinite(user.lat) ||
        !Number.isFinite(user.lon)
      ) {
        continue;
      }

      try {
        // ~1 km aniqlikda keshlanadi: bir xil hududdagilar uchun API'ga bitta so'rov
        const cacheKey = `${date}_${user.lat.toFixed(2)}_${user.lon.toFixed(2)}`;
        let times = timesCache.get(cacheKey);
        if (!times) {
          times = await getPrayerTimes(user.lat, user.lon);
          timesCache.set(cacheKey, times);
        }

        const alreadySent = user.sentPrayers?.[date] || [];
        const due = getDuePrayers(times, minutes, alreadySent, notifyGraceMinutes);

        for (const key of due) {
          const prayerTime = String(times[key]).slice(0, 5);

          await bot.telegram.sendMessage(
            user.id,
            `🕌 ${PRAYER_NAMES[key]} vaqti kirdi!\n\n📅 ${date}\n⏰ ${prayerTime}\n\nAlloh ibodatlaringizni qabul qilsin! 🤲`
          );

          // Faqat bugungi belgilar saqlanadi (eski kunlar o'z-o'zidan tozalanadi)
          userStore.upsertUser(user.id, (u) => ({
            sentPrayers: { [date]: [...(u.sentPrayers?.[date] || []), key] }
          }));

          console.log(`Xabar yuborildi: ${user.id} - ${PRAYER_NAMES[key]}`);
        }
      } catch (error) {
        // Foydalanuvchi botni bloklagan bo'lsa, xabarnomani o'chirib qo'yamiz
        if (error.response?.error_code === 403) {
          userStore.upsertUser(user.id, {
            notificationsEnabled: false,
            blocked: true,
            leftAt: new Date().toISOString()
          });
          console.log(`Foydalanuvchi ${user.id} botni bloklagan, xabarnoma o'chirildi`);
        } else {
          console.error(`Foydalanuvchi ${user.id} uchun xato:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("Xabarnoma tekshiruvida xato:", error.message);
  } finally {
    isChecking = false;
  }
}

function startNotifier(bot, intervalMs = 30000) {
  checkPrayerNotifications(bot);
  return setInterval(() => checkPrayerNotifications(bot), intervalMs);
}

module.exports = { checkPrayerNotifications, startNotifier, PRAYER_NAMES };
