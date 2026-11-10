const test = require("node:test");
const assert = require("node:assert");
const { distance } = require("../src/utils/geo");
const {
  yandexRoute,
  yandexPoint,
  googlePoint,
  yandexSearch,
  googleSearch,
  formatDistance
} = require("../src/utils/links");

test("distance: bir xil nuqta uchun 0", () => {
  assert.strictEqual(distance(41.3, 69.2, 41.3, 69.2), 0);
});

test("distance: 1 daraja kenglik ~111.2 km", () => {
  const d = distance(0, 0, 1, 0);
  assert.ok(Math.abs(d - 111195) < 200, `d=${d}`);
});

test("distance: simmetrik va antipodlarda NaN bermaydi", () => {
  const a = distance(41.3, 69.2, 39.7, 64.4);
  const b = distance(39.7, 64.4, 41.3, 69.2);
  assert.ok(Math.abs(a - b) < 1e-6);
  assert.ok(Number.isFinite(distance(0, 0, 0, 180)));
});

test("distance: foydalanuvchi va No'g'oy masjidi ~1.2 km", () => {
  const d = distance(41.238767, 69.22138, 41.2496133, 69.2218757);
  assert.ok(d > 1150 && d < 1250, `d=${d}`);
});

test("yandexRoute: rtext lat,lon~lat,lon tartibida", () => {
  assert.strictEqual(
    yandexRoute(41.1, 69.1, 41.2, 69.2),
    "https://yandex.com/maps/?rtext=41.1,69.1~41.2,69.2&rtt=auto"
  );
});

test("yandexPoint: pt lon,lat tartibida", () => {
  assert.match(yandexPoint(41.2, 69.3), /pt=69\.3,41\.2/);
});

test("googlePoint", () => {
  assert.strictEqual(googlePoint(41.2, 69.3), "https://www.google.com/maps?q=41.2,69.3");
});

test("formatDistance", () => {
  assert.strictEqual(formatDistance(850), "850 m");
  assert.strictEqual(formatDistance(1207), "1.2 km");
  assert.strictEqual(formatDistance(NaN), "");
});

test("manzil bo'yicha qidiruv havolalari URL-kodlanadi", () => {
  const q = "Toshkent, Chilonzor, Cho'ponota ko'chasi 28A";
  assert.ok(yandexSearch(q).startsWith("https://yandex.com/maps/?text=Toshkent%2C%20Chilonzor"));
  assert.ok(googleSearch(q).includes("api=1&query=Toshkent%2C%20Chilonzor"));
  assert.ok(!yandexSearch(q).includes(" "));
});
