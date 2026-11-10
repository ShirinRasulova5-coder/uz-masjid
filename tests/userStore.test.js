const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createUserStore } = require("../src/services/userStore");

function tmpStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "users-"));
  const file = path.join(dir, "users.json");
  return { file, store: createUserStore(file) };
}

test("fayl yo'q bo'lsa bo'sh ro'yxat", () => {
  assert.deepStrictEqual(tmpStore().store.getUsers(), []);
});

test("upsertUser: yaratadi va keyin yangilaydi, boshqa maydonlarni saqlaydi", () => {
  const { store } = tmpStore();
  store.upsertUser(1, { firstName: "Ali" });
  store.upsertUser(1, { lat: 41, lon: 69 });
  assert.deepStrictEqual(store.getUser(1), { firstName: "Ali", lat: 41, lon: 69, id: 1 });
  assert.strictEqual(store.getUsers().length, 1);
});

test("upsertUser: funksiya bilan o'zgartirish (toggle)", () => {
  const { store } = tmpStore();
  store.upsertUser(7, (u) => ({ notificationsEnabled: !u.notificationsEnabled }));
  store.upsertUser(7, (u) => ({ notificationsEnabled: !u.notificationsEnabled }));
  assert.strictEqual(store.getUser(7).notificationsEnabled, false);
});

test("buzilgan JSON bo'lsa ustidan yozib yubormaydi, xato beradi", () => {
  const { store, file } = tmpStore();
  fs.writeFileSync(file, "{broken");
  assert.throws(() => store.upsertUser(1, { a: 1 }));
  assert.strictEqual(fs.readFileSync(file, "utf8"), "{broken");
});
