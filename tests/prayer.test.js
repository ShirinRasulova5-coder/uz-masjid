const test = require("node:test");
const assert = require("node:assert");
const { getDuePrayers, toMinutes } = require("../src/services/prayerSchedule");
const { getLocalNow } = require("../src/utils/time");

const TIMES = { fajr: "05:42", sunrise: "07:05", dhuhr: "12:15", asr: "15:30", maghrib: "17:20", isha: "18:45 (+05)" };
const at = (h, m) => h * 60 + m;

test("toMinutes", () => {
  assert.strictEqual(toMinutes("05:42"), 342);
  assert.strictEqual(toMinutes("18:45 (+05)"), 18 * 60 + 45);
  assert.strictEqual(toMinutes("25:00"), null);
  assert.strictEqual(toMinutes(undefined), null);
});

test("aynan vaqt kirganda yuboriladi", () => {
  assert.deepStrictEqual(getDuePrayers(TIMES, at(12, 15)), ["dhuhr"]);
});

test("vaqtdan oldin yuborilmaydi", () => {
  assert.deepStrictEqual(getDuePrayers(TIMES, at(12, 14)), []);
});

test("tekshiruv kechiksa ham (grace ichida) yuboriladi", () => {
  assert.deepStrictEqual(getDuePrayers(TIMES, at(12, 19)), ["dhuhr"]);
});

test("grace o'tib ketsa eski namoz yuborilmaydi", () => {
  assert.deepStrictEqual(getDuePrayers(TIMES, at(12, 21)), []);
});

test("allaqachon yuborilgani qayta yuborilmaydi", () => {
  assert.deepStrictEqual(getDuePrayers(TIMES, at(12, 16), ["dhuhr"]), []);
});

test("quyosh chiqishi (sunrise) xabarnomaga kirmaydi", () => {
  assert.deepStrictEqual(getDuePrayers(TIMES, at(7, 5)), []);
});

test("buzuq vaqt qiymati xato bermaydi", () => {
  assert.deepStrictEqual(getDuePrayers({ fajr: "xx", dhuhr: null }, at(12, 15)), []);
  assert.deepStrictEqual(getDuePrayers(undefined, at(12, 15)), []);
});

test("getLocalNow: UTC 07:05 -> Toshkent 12:05", () => {
  const r = getLocalNow("Asia/Tashkent", new Date("2026-11-10T07:05:00Z"));
  assert.deepStrictEqual(r, { date: "2026-11-10", time: "12:05", minutes: 12 * 60 + 5 });
});

test("getLocalNow: UTC 20:00 -> Toshkent ertasi kun 01:00", () => {
  const r = getLocalNow("Asia/Tashkent", new Date("2026-11-10T20:00:00Z"));
  assert.strictEqual(r.date, "2026-11-11");
  assert.strictEqual(r.minutes, 60);
});
