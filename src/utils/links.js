// Xarita havolalari. Yandex: pt=lon,lat  |  rtext=lat,lon~lat,lon
function yandexPoint(lat, lon) {
  return `https://yandex.com/maps/?pt=${lon},${lat}&z=17&l=map`;
}

function yandexRoute(fromLat, fromLon, toLat, toLon) {
  return `https://yandex.com/maps/?rtext=${fromLat},${fromLon}~${toLat},${toLon}&rtt=auto`;
}

function googlePoint(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

// Manzil bo'yicha qidiruv (aniq koordinata yo'q joylar uchun)
function yandexSearch(query) {
  return `https://yandex.com/maps/?text=${encodeURIComponent(query)}`;
}

function googleSearch(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

module.exports = {
  yandexPoint,
  yandexRoute,
  googlePoint,
  yandexSearch,
  googleSearch,
  formatDistance
};
