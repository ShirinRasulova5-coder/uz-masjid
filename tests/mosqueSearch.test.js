const test = require("node:test");
const assert = require("node:assert");
const { searchNearby, applyFlags } = require("../src/services/mosqueSearch");

const USER = { lat: 41.2388, lon: 69.2214 };
const mk = (uid, dLat, extra = {}) => ({
  uid,
  name: uid,
  lat: USER.lat + dLat,
  lon: USER.lon,
  ...extra
});

// 0.01 daraja kenglik ~ 1.11 km
const MOSQUES = [
  mk("far", 0.5),          // ~55 km
  mk("near", 0.005),       // ~0.55 km
  mk("mid", 0.02),         // ~2.2 km
  mk("women", 0.03, { women: true }),
  mk("ramp", 0.04, { wheelchair: "yes" }),
  { uid: "bad", name: "bad", lat: "x", lon: null }
];

test("masofa bo'yicha saralaydi va radiusdagilarni qaytaradi", () => {
  const { items, radius } = searchNearby(MOSQUES, USER.lat, USER.lon);
  assert.strictEqual(radius, 2000);
  assert.deepStrictEqual(items.map((m) => m.uid), ["near"]);
  assert.ok(items[0].distance > 500 && items[0].distance < 600);
});

test("limit ishlaydi", () => {
  const { items } = searchNearby(MOSQUES, USER.lat, USER.lon, { limit: 2, radii: [10000] });
  assert.strictEqual(items.length, 2);
  assert.deepStrictEqual(items.map((m) => m.uid), ["near", "mid"]);
});

test("atrofda yo'q bo'lsa radius kengayadi", () => {
  const { items, radius } = searchNearby([mk("only", 0.2)], USER.lat, USER.lon);
  assert.strictEqual(radius, 100000);
  assert.strictEqual(items[0].uid, "only");
});

test("hech narsa yo'q bo'lsa bo'sh natija", () => {
  assert.deepStrictEqual(searchNearby([], USER.lat, USER.lon), { items: [], radius: null });
});

test("ayollar filtri", () => {
  const { items } = searchNearby(MOSQUES, USER.lat, USER.lon, { filter: "women" });
  assert.deepStrictEqual(items.map((m) => m.uid), ["women"]);
});

test("qulaylik filtri", () => {
  const { items } = searchNearby(MOSQUES, USER.lat, USER.lon, { filter: "accessible" });
  assert.deepStrictEqual(items.map((m) => m.uid), ["ramp"]);
});

test("noto'g'ri koordinatali yozuvlar o'tkazib yuboriladi", () => {
  const { items } = searchNearby(MOSQUES, USER.lat, USER.lon, { limit: 100, radii: [Infinity] });
  assert.ok(!items.some((m) => m.uid === "bad"));
});

test("noto'g'ri foydalanuvchi koordinatasi xato beradi", () => {
  assert.throws(() => searchNearby(MOSQUES, NaN, 69));
  assert.throws(() => searchNearby(MOSQUES, 41, undefined));
});

test("applyFlags qo'lda belgilarni qo'shadi, asl ro'yxatni o'zgartirmaydi", () => {
  const src = [mk("a", 0.01)];
  const res = applyFlags(src, { a: { women: true } });
  assert.strictEqual(res[0].women, true);
  assert.strictEqual(src[0].women, undefined);
});
