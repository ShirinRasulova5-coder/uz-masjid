const axios = require("axios");
const { timezone, prayerMethod, asrSchool } = require("../config");

function getLocalDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) values[part.type] = part.value;

  return `${values.day}-${values.month}-${values.year}`;
}

async function getPrayerTimes(lat, lon) {
  const date = getLocalDate();

  const response = await axios.get(
    `https://api.aladhan.com/v1/timings/${date}`,
    {
      params: {
        latitude: lat,
        longitude: lon,
        method: prayerMethod,
        school: asrSchool,
        timezonestring: timezone
      },
      timeout: 15000
    }
  );

  if (response.data.code !== 200) {
    throw new Error("Namoz vaqtlarini olishda xatolik");
  }

  const timings = response.data.data.timings;

  return {
    date,
    fajr: timings.Fajr,
    sunrise: timings.Sunrise,
    dhuhr: timings.Dhuhr,
    asr: timings.Asr,
    maghrib: timings.Maghrib,
    isha: timings.Isha
  };
}

module.exports = { getPrayerTimes };
