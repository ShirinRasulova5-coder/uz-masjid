require("dotenv").config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  timezone: "Asia/Tashkent",
  // Masjid qidirish: avval 2 km, topilmasa 5 km, 20 km, 100 km, keyin butun O'zbekiston
  searchRadii: [2000, 5000, 20000, 100000, Infinity],
  maxMosques: 5,
  prayerMethod: 3,
  // Asr vaqti uchun mazhab: 0 = Shofe'iy (hozirgi holat), 1 = Hanafiy.
  // O'zbekiston muftiyati taqvimi bilan solishtirib tanlang.
  asrSchool: 0,
  // Vaqt kirgandan keyin xabar yuborish uchun maksimal kechikish (daqiqa)
  notifyGraceMinutes: 5
};
