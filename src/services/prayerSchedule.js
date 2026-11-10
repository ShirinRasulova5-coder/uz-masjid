const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function toMinutes(value) {
  const match = /(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

// Hozir yuborilishi kerak bo'lgan namozlar.
// Aniq daqiqaga tenglashtirmaymiz: vaqt kirgandan keyin `graceMinutes` ichida
// hali yuborilmagan bo'lsa yuboriladi (tekshiruv kechiksa ham xabar yo'qolmaydi).
function getDuePrayers(times, nowMinutes, sentKeys = [], graceMinutes = 5) {
  return PRAYER_KEYS.filter((key) => {
    const t = toMinutes(times?.[key]);
    if (t === null) return false;
    const diff = nowMinutes - t;
    return diff >= 0 && diff <= graceMinutes && !sentKeys.includes(key);
  });
}

module.exports = { PRAYER_KEYS, toMinutes, getDuePrayers };
