const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const { botToken } = require("./config");
const { findNearbyMosques } = require("./services/mosqueService");
const { getPrayerTimes } = require("./services/prayerService");
const userStore = require("./services/userStore");
const {
  yandexRoute,
  googlePoint,
  yandexSearch,
  googleSearch,
  formatDistance
} = require("./utils/links");
const specialPlaces = require("../data/special_places.json");

if (!botToken) {
  throw new Error("BOT_TOKEN .env faylida mavjud emas! .env.example faylidan .env yarating.");
}

const bot = new Telegraf(botToken);

const ADMIN_ID = 6163243585;

const BTN = {
  nearby: "🕌 Yaqin masjidlar",
  prayer: "🕋 Namoz vaqtlari",
  women: "👩 Ayollar uchun masjid",
  blind: "🦯 Ko‘zi ojizlar masjidi",
  notify: "🔔 Namoz xabarnomasini yoqish",
  location: "📍 Joylashuvni yuborish",
  help: "ℹ️ Yordam",
  menu: "🔙 Bosh menyu"
};

function mainMenu() {
  return Markup.keyboard([
    [BTN.nearby, BTN.prayer],
    [BTN.women, BTN.blind],
    [BTN.notify],
    [BTN.location],
    [BTN.help]
  ]).resize();
}

function hasLocation(user) {
  return Boolean(user) && Number.isFinite(user.lat) && Number.isFinite(user.lon);
}

function registerUser(ctx) {
  userStore.upsertUser(ctx.from.id, (existing) => ({
    firstName: ctx.from.first_name || "",
    username: ctx.from.username || "",
    joinedAt: existing.joinedAt || new Date().toISOString()
  }));
}

bot.command("myid", async (ctx) => {
  await ctx.reply(`Sizning Telegram ID: ${ctx.from.id}`);
});

bot.on("my_chat_member", (ctx) => {
  if (ctx.chat.type !== "private") return;

  const status = ctx.myChatMember.new_chat_member.status;

  if (status === "kicked") {
    userStore.upsertUser(ctx.from.id, {
      blocked: true,
      leftAt: new Date().toISOString(),
      notificationsEnabled: false
    });
  } else if (status === "member") {
    userStore.upsertUser(ctx.from.id, { blocked: false, leftAt: null });
  }
});

bot.start(async (ctx) => {
  registerUser(ctx);
  await ctx.reply(
    "Assalomu alaykum! 🕌\n\nO‘zbekiston masjidlari botiga xush kelibsiz.\n\nYaqin masjidlarni topish va namoz vaqtlarini ko‘rish uchun GPS joylashuvingizni yuboring.",
    mainMenu()
  );
});

bot.command("admin", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("⛔ Siz admin emassiz!");
  }

  const users = userStore.getUsers();
  const today = new Date().toISOString().slice(0, 10);
  const todayUsers = users.filter((u) => u.joinedAt?.slice(0, 10) === today);
  const notifyUsers = users.filter((u) => u.notificationsEnabled === true);
  const leftUsers = users.filter((u) => u.blocked === true);

  await ctx.reply(
    `👑 ADMIN PANEL\n\n` +
    `👥 Jami foydalanuvchilar: ${users.length}\n` +
    `🆕 Bugun qo‘shilganlar: ${todayUsers.length}\n` +
    `🔔 Xabarnoma yoqilgan: ${notifyUsers.length}\n` +
    `🚪 Botni tark etganlar: ${leftUsers.length}\n` +
    `✅ Faol: ${users.length - leftUsers.length}`
  );

  if (users.length === 0) return;

  let message = "📋 FOYDALANUVCHILAR RO‘YXATI\n\n";

  for (const [index, user] of users.entries()) {
    const name = user.firstName || "Ismsiz";
    const username = user.username ? `@${user.username}` : "Username yo‘q";
    const date = user.joinedAt ? user.joinedAt.slice(0, 10) : "Eski foydalanuvchi";

    const line =
      `${index + 1}. ${name}\n` +
      `🆔 ID: ${user.id}\n` +
      `👤 ${username}\n` +
      `📅 Sana: ${date}\n` +
      (user.blocked ? `🚪 Chiqib ketgan: ${user.leftAt?.slice(0, 10) || "?"}\n` : "") +
      "\n";

    if (message.length + line.length > 3500) {
      await ctx.reply(message);
      message = "";
    }

    message += line;
  }

  if (message) await ctx.reply(message);
});

bot.hears(BTN.notify, async (ctx) => {
  const user = userStore.getUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Avval /start bosing va ro‘yxatdan o‘ting.");
  }

  // Joylashuvsiz xabarnoma yuborib bo'lmaydi (namoz vaqti joyga bog'liq)
  if (!hasLocation(user)) {
    return ctx.reply(
      "Xabarnoma namoz vaqtini hisoblashi uchun avval joylashuvingizni yuboring: «📍 Joylashuvni yuborish»."
    );
  }

  const updated = userStore.upsertUser(ctx.from.id, (u) => ({
    notificationsEnabled: !u.notificationsEnabled
  }));

  return ctx.reply(
    updated.notificationsEnabled
      ? "🔔 Namoz vaqtlari haqida xabarnomalar yoqildi!\nHar bir namoz vaqti kirganda xabar keladi."
      : "🔕 Namoz xabarnomalari o‘chirildi."
  );
});

bot.hears(BTN.location, async (ctx) => {
  await ctx.reply(
    "Joylashuvingizni yuboring:",
    Markup.keyboard([
      [Markup.button.locationRequest("📍 GPS joylashuvim")],
      [BTN.menu]
    ]).resize()
  );
});

async function getLocationName(lat, lon) {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon, format: "jsonv2", "accept-language": "uz" },
      headers: { "User-Agent": "UzMasjidFinderBot/1.0" },
      timeout: 15000
    });

    const address = response.data.address || {};

    return (
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state_district ||
      address.state ||
      "Hudud aniqlanmadi"
    );
  } catch (error) {
    console.log("Hududni aniqlash xatosi:", error.message);
    return "Hudud aniqlanmadi";
  }
}

const EMPTY_TEXT = {
  all: "Masjid topilmadi. OSM bazasida ma'lumot bo‘lmasligi mumkin.",
  women:
    "👩 Ayollar uchun alohida masjid haqida ma'lumot bazada topilmadi. Bu ma'lumot OpenStreetMap'da deyarli kiritilmagan; uni data/mosque_flags.json orqali qo‘shish mumkin.",
  accessible: "Bunday masjid bazada topilmadi."
};

const TITLE_TEXT = {
  all: "🕌 Sizga eng yaqin masjidlar",
  women: "👩 Ayollar va qizlar uchun maxsus namozxonasi bor masjidlar",
  accessible: "♿ Qulay masjidlar"
};

function radiusNote(radius) {
  if (radius === null || radius <= 2000) return "";
  if (!Number.isFinite(radius)) return "\n(yaqin atrofda topilmadi — butun O‘zbekiston bo‘yicha qidirildi)";
  return `\n(yaqin atrofda topilmadi — ${formatDistance(radius)} gacha kengaytirildi)`;
}

async function sendMosques(ctx, filter = "all") {
  const user = userStore.getUser(ctx.from.id);
  if (!hasLocation(user)) {
    return ctx.reply(
      "Avval GPS joylashuvingizni yuboring: «📍 Joylashuvni yuborish».",
      mainMenu()
    );
  }

  await ctx.reply("🔎 Masjidlar qidirilmoqda...");

  try {
    const { items, radius } = await findNearbyMosques(user.lat, user.lon, { filter });

    if (!items.length) {
      return ctx.reply(EMPTY_TEXT[filter] || EMPTY_TEXT.all);
    }

    await ctx.reply(`${TITLE_TEXT[filter] || TITLE_TEXT.all}:${radiusNote(radius)}`);

    // Har bir masjid - aniq joylashuv (pin) + Yandex/Google tugmalari
    for (const mosque of items) {
      const where = mosque.address || mosque.city || "Manzil ko‘rsatilmagan";
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.url(
            "🧭 Yandex: yo‘l",
            yandexRoute(user.lat, user.lon, mosque.lat, mosque.lon)
          ),
          Markup.button.url("🗺 Google", googlePoint(mosque.lat, mosque.lon))
        ]
      ]);

      await ctx.replyWithVenue(
        mosque.lat,
        mosque.lon,
        mosque.name,
        `📏 ${formatDistance(mosque.distance)} • ${where}`,
        keyboard
      );
    }
  } catch (error) {
    console.error("MASJID XATOSI:", error.message);
    await ctx.reply("Masjidlarni qidirishda xatolik yuz berdi.");
  }
}

bot.on("location", async (ctx) => {
  const { latitude, longitude } = ctx.message.location;

  await ctx.reply("📍 Hududingiz aniqlanmoqda...");

  const regionName = await getLocationName(latitude, longitude);

  userStore.upsertUser(ctx.from.id, {
    lat: latitude,
    lon: longitude,
    regionName,
    updatedAt: new Date().toISOString()
  });

  await ctx.reply(
    `✅ Joylashuvingiz saqlandi!\n📍 Hudud: ${regionName}`,
    mainMenu()
  );

  // Joylashuv kelishi bilan eng yaqin masjidlarni avtomatik ko'rsatamiz
  await sendMosques(ctx, "all");
});

bot.hears(BTN.nearby, (ctx) => sendMosques(ctx, "all"));
bot.hears(BTN.women, (ctx) => sendMosques(ctx, "women"));

// Ko'zi ojizlar masjidi: aniq manzil bo'yicha Yandex/Google qidiruvi
bot.hears(BTN.blind, async (ctx) => {
  for (const place of specialPlaces.blind) {
    await ctx.reply(
      `🦯 ${place.name}\n📍 ${place.address}`,
      Markup.inlineKeyboard([
        [
          Markup.button.url("🧭 Yandex xarita", yandexSearch(place.query)),
          Markup.button.url("🗺 Google", googleSearch(place.query))
        ]
      ])
    );
  }
});

bot.hears(BTN.prayer, async (ctx) => {
  const user = userStore.getUser(ctx.from.id);
  if (!hasLocation(user)) return ctx.reply("Avval GPS joylashuvingizni yuboring.");

  try {
    await ctx.reply("⏳ Namoz vaqtlari olinmoqda...");
    const times = await getPrayerTimes(user.lat, user.lon);

    await ctx.reply(
      `🕌 NAMOZ VAQTLARI\n` +
      `📅 ${times.date}\n\n` +
      `🌅 Bomdod: ${times.fajr}\n` +
      `☀️ Quyosh: ${times.sunrise}\n` +
      `🕛 Peshin: ${times.dhuhr}\n` +
      `🌤 Asr: ${times.asr}\n` +
      `🌇 Shom: ${times.maghrib}\n` +
      `🌙 Xufton: ${times.isha}\n\n` +
      `📍 Joylashuvingiz asosida hisoblandi. Vaqtlarni mahalliy rasmiy taqvim bilan solishtiring.`
    );
  } catch (error) {
    console.error("Namoz vaqti xatosi:", error.message);
    await ctx.reply("Namoz vaqtlarini olishda xatolik yuz berdi.");
  }
});

bot.hears(BTN.help, async (ctx) => {
  await ctx.reply(
    "🕌 Bot imkoniyatlari:\n\n" +
    "📍 GPS orqali joylashuv yuborish\n" +
    "🕌 Yaqin masjidlarni topish (Yandex/Google xaritada yo‘l ko‘rsatish bilan)\n" +
    "👩 Ayollar va qizlar uchun masjidlar\n" +
    "🦯 Ko‘zi ojizlar masjidi\n" +
    "🕋 Namoz vaqtlarini ko‘rish\n" +
    "🔔 Har bir namoz vaqtida xabarnoma"
  );
});

bot.hears(BTN.menu, async (ctx) => {
  await ctx.reply("Bosh menyu:", mainMenu());
});

bot.catch((error, ctx) => {
  console.error(`Bot xatosi (${ctx.updateType}):`, error);
});

module.exports = bot;
