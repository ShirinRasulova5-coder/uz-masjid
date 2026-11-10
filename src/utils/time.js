// Berilgan vaqt mintaqasidagi hozirgi sana va vaqt
function getLocalNow(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);

  const v = {};
  for (const part of parts) v[part.type] = part.value;

  return {
    date: `${v.year}-${v.month}-${v.day}`,
    time: `${v.hour}:${v.minute}`,
    minutes: Number(v.hour) * 60 + Number(v.minute)
  };
}

module.exports = { getLocalNow };
