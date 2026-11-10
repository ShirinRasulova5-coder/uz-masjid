"""OSM PBF dan masjidlar bazasini (data/mosques.json) yaratadi.
Node VA way (bino) ob'ektlarini o'qiydi. Ishga tushirish: python3 tools/build_mosques.py
Qo'shimcha kutubxona kerak emas."""
import zlib, struct, sys, json

def varint(b, i):
    r = 0; s = 0
    while True:
        c = b[i]; i += 1
        r |= (c & 0x7f) << s
        if not c & 0x80: return r, i
        s += 7

def fields(b):
    i = 0; n = len(b)
    while i < n:
        k, i = varint(b, i)
        f, w = k >> 3, k & 7
        if w == 0:
            v, i = varint(b, i)
        elif w == 2:
            l, i = varint(b, i); v = b[i:i+l]; i += l
        elif w == 1:
            v = b[i:i+8]; i += 8
        elif w == 5:
            v = b[i:i+4]; i += 4
        else:
            raise ValueError(w)
        yield f, w, v

def packed(b, signed=False):
    i = 0; out = []
    while i < len(b):
        v, i = varint(b, i)
        if signed: v = (v >> 1) ^ -(v & 1)
        out.append(v)
    return out

def blobs(path):
    with open(path, 'rb') as f:
        while True:
            h = f.read(4)
            if not h: break
            hl = struct.unpack('>I', h)[0]
            hdr = f.read(hl)
            typ = None; size = 0
            for fn, w, v in fields(hdr):
                if fn == 1: typ = v.decode()
                elif fn == 3: size = v
            data = f.read(size)
            if typ != 'OSMData': continue
            raw = None
            for fn, w, v in fields(data):
                if fn == 3: raw = zlib.decompress(v)
                elif fn == 1: raw = v
            yield raw

def block(raw):
    strings = []; groups = []; gran = 100; lat_off = 0; lon_off = 0
    for fn, w, v in fields(raw):
        if fn == 1:
            for f2, w2, v2 in fields(v):
                if f2 == 1: strings.append(v2.decode('utf8', 'replace'))
        elif fn == 2: groups.append(v)
        elif fn == 17: gran = v
        elif fn == 19: lat_off = v
        elif fn == 20: lon_off = v
    return strings, groups, gran, lat_off, lon_off

def is_mosque(t):
    return t.get('amenity') == 'place_of_worship' and (t.get('religion') == 'muslim' or t.get('building') == 'mosque')

def way_iter(groups, strings):
    for g in groups:
        for fn, w, v in fields(g):
            if fn == 3:
                wid = 0; keys = []; vals = []; refs = []
                for f2, w2, v2 in fields(v):
                    if f2 == 1: wid = v2
                    elif f2 == 2: keys = packed(v2)
                    elif f2 == 3: vals = packed(v2)
                    elif f2 == 8:
                        d = 0
                        for x in packed(v2, True):
                            d += x; refs.append(d)
                yield wid, {strings[k]: strings[x] for k, x in zip(keys, vals)}, refs

def node_iter(groups, strings, gran, lo, lno):
    for g in groups:
        for fn, w, v in fields(g):
            if fn == 2:  # dense
                ids = lats = lons = kv = []
                for f2, w2, v2 in fields(v):
                    if f2 == 1: ids = packed(v2, True)
                    elif f2 == 8: lats = packed(v2, True)
                    elif f2 == 9: lons = packed(v2, True)
                    elif f2 == 10: kv = packed(v2)
                i = a = o = 0; ki = 0
                for n in range(len(ids)):
                    i += ids[n]; a += lats[n]; o += lons[n]
                    tags = {}
                    while ki < len(kv) and kv[ki] != 0:
                        tags[strings[kv[ki]]] = strings[kv[ki+1]]; ki += 2
                    ki += 1
                    yield i, 1e-9*(lo + gran*a), 1e-9*(lno + gran*o), tags


import os, re, math

WOMEN_RE = re.compile(r"ayollar|xotin|аёллар|хотин|женск|women|ladies|qizlar", re.I)


def pick_name(t):
    for k in ("name:uz", "name", "name:uz-cyr", "name:ru", "name:en", "alt_name"):
        if t.get(k, "").strip():
            return t[k].strip()
    return ""


def pick_address(t):
    if t.get("addr:full"):
        return t["addr:full"].strip()
    street = " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x)
    return street.strip()


def hv(a, b, c, d):
    R = 6371000; p = math.pi / 180
    x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def norm(s):
    return re.sub(r"[^\w]", "", s.lower())


def build(path):
    mosque_ways = {}
    for raw in blobs(path):
        strings, groups, gran, lo, lno = block(raw)
        for wid, tags, refs in way_iter(groups, strings):
            if is_mosque(tags):
                mosque_ways[wid] = (tags, refs)
    need = {r for _, refs in mosque_ways.values() for r in refs}
    coords = {}; items = []
    for raw in blobs(path):
        strings, groups, gran, lo, lno = block(raw)
        for nid, la, lo_, tags in node_iter(groups, strings, gran, lo, lno):
            if nid in need:
                coords[nid] = (la, lo_)
            if tags and is_mosque(tags):
                items.append(("node", nid, la, lo_, tags))
    for wid, (t, refs) in mosque_ways.items():
        pts = [coords[r] for r in refs if r in coords]
        if pts:
            items.append(("way", wid, sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts), t))

    # Takrorlarni olib tashlash: bir binoni ham node, ham way sifatida kiritishgan bo'lishi mumkin.
    # Yaqin (nomli: 60 m, nomsiz: 25 m) bo'lsa - binoni (way) yoki ko'p ma'lumotlisini qoldiramiz.
    def score(it):
        return (it[0] == "way", len(it[4]))
    items.sort(key=score, reverse=True)
    kept = []
    for it in items:
        name = norm(pick_name(it[4]))
        dup = False
        for k in kept:
            kn = norm(pick_name(k[4]))
            d = hv(it[2], it[3], k[2], k[3])
            if d < 25 or (d < 60 and name and name == kn):
                dup = True
                break
        if not dup:
            kept.append(it)

    out = []
    for osm, oid, la, lo_, t in kept:
        name = pick_name(t)
        names_blob = " ".join(v for k, v in t.items() if k.startswith("name") or k == "alt_name")
        out.append({
            "uid": ("n" if osm == "node" else "w") + str(oid),
            "id": oid,
            "osm": osm,
            "name": name or "Masjid (nomi ko‘rsatilmagan)",
            "lat": round(la, 6),
            "lon": round(lo_, 6),
            "address": pick_address(t),
            "city": t.get("addr:city") or t.get("addr:district") or "",
            "women": bool(WOMEN_RE.search(names_blob)),
            "wheelchair": t.get("wheelchair", ""),
        })
    out.sort(key=lambda m: m["uid"])
    return out, len(items)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    pbf = os.path.join(here, "..", "data", "uzbekistan-latest.osm.pbf")
    dst = os.path.join(here, "..", "data", "mosques.json")
    mosques, before = build(pbf)
    with open(dst, "w", encoding="utf8") as f:
        json.dump(mosques, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Topildi: {before}, takrorlarsiz: {len(mosques)} -> {dst}")
