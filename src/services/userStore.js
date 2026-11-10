const fs = require("fs");
const path = require("path");

const DEFAULT_PATH = path.join(__dirname, "../../data/users.json");

function createUserStore(filePath = DEFAULT_PATH) {
  function getUsers() {
    let raw;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    // Fayl buzilgan bo'lsa bo'sh ro'yxat qaytarib ustidan yozib yubormaymiz - xato beramiz
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  }

  function saveUsers(users) {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(users, null, 2), "utf8");
    fs.renameSync(tmp, filePath);
  }

  function getUser(id) {
    return getUsers().find((u) => u.id === id);
  }

  // O'qish-o'zgartirish-yozish bitta sinxron qadamda bajariladi (await yo'q),
  // shuning uchun bot va xabarnoma yuboruvchi bir-birining ma'lumotini o'chirib yubormaydi.
  function upsertUser(id, patch) {
    const users = getUsers();
    const index = users.findIndex((u) => u.id === id);
    const existing = index >= 0 ? users[index] : {};
    const changes = typeof patch === "function" ? patch(existing) : patch;
    const next = { ...existing, ...changes, id };

    if (index >= 0) users[index] = next;
    else users.push(next);

    saveUsers(users);
    return next;
  }

  return { getUsers, saveUsers, getUser, upsertUser };
}

module.exports = { createUserStore, ...createUserStore() };
