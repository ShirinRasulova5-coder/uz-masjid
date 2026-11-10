const fs = require("fs");
const path = require("path");
const { maxMosques, searchRadii } = require("../config");
const { searchNearby, applyFlags } = require("./mosqueSearch");

const DB_PATH = path.join(__dirname, "../../data/mosques.json");
const FLAGS_PATH = path.join(__dirname, "../../data/mosque_flags.json");

let cache = { mtime: 0, flagsMtime: 0, mosques: [] };

function mtime(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

// Fayllar o'zgarsagina qayta o'qiladi (har so'rovda 300 KB parse qilinmaydi)
function loadMosques() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error("mosques.json fayli topilmadi!");
  }

  const m1 = mtime(DB_PATH);
  const m2 = mtime(FLAGS_PATH);

  if (m1 !== cache.mtime || m2 !== cache.flagsMtime) {
    const mosques = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    let flags = {};
    try {
      flags = JSON.parse(fs.readFileSync(FLAGS_PATH, "utf8"));
    } catch {
      flags = {};
    }
    cache = { mtime: m1, flagsMtime: m2, mosques: applyFlags(mosques, flags) };
  }

  return cache.mosques;
}

// filter: "all" | "women" | "accessible"
async function findNearbyMosques(lat, lon, { filter = "all" } = {}) {
  return searchNearby(loadMosques(), lat, lon, {
    filter,
    limit: maxMosques,
    radii: searchRadii
  });
}

module.exports = { findNearbyMosques };
