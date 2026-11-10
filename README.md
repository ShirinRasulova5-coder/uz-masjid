# O‘zbekiston Masjidlari Telegram Bot

## Talablar
- Node.js 18+ (testlar uchun `node --test`), Python 3 (faqat bazani qayta yaratish uchun)
- BotFather tokeni

## O‘rnatish va ishga tushirish
```bash
npm install
cp .env.example .env      # Windows: Copy-Item .env.example .env
# .env ichida BOT_TOKEN=... ni to'ldiring
npm start
```

## Testlar
```bash
npm test
```

## Masjidlar bazasi
`data/mosques.json` OpenStreetMap PBF faylidan yaratiladi (node **va** way/bino ob'ektlari, takrorlari olib tashlangan):
```bash
# data/uzbekistan-latest.osm.pbf ni https://download.geofabrik.de/asia/uzbekistan.html dan yuklab oling
python3 tools/build_mosques.py
```

### Ayollar / qulay masjidlar
OSM'da «ayollar uchun» belgisi yo‘q. Bot nomida «ayollar», «xotin-qizlar» va shunga o‘xshash so‘z bor masjidlarni avtomatik belgilaydi,
qolganini `data/mosque_flags.json` ga qo‘lda yozasiz (kalit — `uid`, masalan `w123456789` yoki `n987654321`):
```json
{
  "w123456789": { "women": true },
  "n987654321": { "wheelchair": "yes" }
}
```
`uid` ni `data/mosques.json` dan nom bo‘yicha qidirib topasiz. Fayl o‘zgarsa bot o‘zi qayta o‘qiydi.

## Namoz vaqti
`src/config.js`: `prayerMethod` (hozir 3) va `asrSchool` (0 = Shofe'iy, 1 = Hanafiy). Natijani muftiyat taqvimi bilan solishtirib tanlang.
