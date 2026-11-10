const { distance } = require("../utils/geo");

const DEFAULT_RADII = [2000, 5000, 20000, 100000, Infinity];

function matchesFilter(mosque, filter) {
  if (filter === "women") return mosque.women === true;
  if (filter === "accessible") return mosque.wheelchair === "yes";
  return true;
}

// Qo'lda kiritilgan belgilarni (data/mosque_flags.json) masjidlarga qo'shadi
function applyFlags(mosques, flags = {}) {
  return mosques.map((m) => (flags[m.uid] ? { ...m, ...flags[m.uid] } : m));
}

// Eng yaqin masjidlar. Atrofda topilmasa radius bosqichma-bosqich kengayadi
// (2 km -> 5 km -> 20 km -> 100 km -> butun O'zbekiston).
function searchNearby(mosques, lat, lon, options = {}) {
  const { radii = DEFAULT_RADII, limit = 5, filter = "all" } = options;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Koordinatalar noto'g'ri");
  }

  const sorted = mosques
    .filter(
      (m) =>
        Number.isFinite(m.lat) &&
        Number.isFinite(m.lon) &&
        matchesFilter(m, filter)
    )
    .map((m) => ({ ...m, distance: Math.round(distance(lat, lon, m.lat, m.lon)) }))
    .sort((a, b) => a.distance - b.distance);

  for (const radius of radii) {
    const items = sorted.filter((m) => m.distance <= radius).slice(0, limit);
    if (items.length) return { items, radius };
  }

  return { items: [], radius: null };
}

module.exports = { searchNearby, applyFlags, matchesFilter, DEFAULT_RADII };
