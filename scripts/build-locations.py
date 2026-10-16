"""Builds src/data/locations.json from Türkiye API dumps (provinces.json, d1.json, d2.json).

Usage: python3 -I scripts/build-locations.py <dump_dir> <out_file>
Source: https://api.turkiyeapi.dev (dataset 2025, TÜİK ADNKS based). Cross-check with
TÜİK / İçişleri Bakanlığı before production.
"""
import json, sys, os

TR = str.maketrans({"ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u",
                    "Ç": "c", "Ğ": "g", "Ö": "o", "Ş": "s", "Ü": "u", "â": "a", "î": "i", "û": "u"})

def slug(s):
    s = s.translate(TR).lower()
    out, dash = [], False
    for ch in s:
        if ch.isalnum() and ch.isascii():
            out.append(ch); dash = False
        elif not dash:
            out.append("-"); dash = True
    return "".join(out).strip("-")

src, dst = sys.argv[1], sys.argv[2]
prov = json.load(open(os.path.join(src, "provinces.json")))["data"]
dist = json.load(open(os.path.join(src, "d1.json")))["data"] + json.load(open(os.path.join(src, "d2.json")))["data"]
assert len(prov) == 81, len(prov)
assert len(dist) == 973, len(dist)

provinces = []
for p in sorted(prov, key=lambda p: p["id"]):
    provinces.append({
        "plate": p["id"], "name": p["name"], "slug": slug(p["name"]),
        "region": p["region"]["tr"], "metropolitan": p["isMetropolitan"],
        "coastal": p["isCoastal"], "population": p["population"],
        "lat": round(p["coordinates"]["latitude"], 5), "lng": round(p["coordinates"]["longitude"], 5),
    })
districts = []
for d in sorted(dist, key=lambda d: (d["provinceId"], d["name"])):
    districts.append({"plate": d["provinceId"], "name": d["name"], "slug": slug(d["name"]), "population": d["population"]})

assert len({p["slug"] for p in provinces}) == 81
seen = set()
for d in districts:
    key = (d["plate"], d["slug"])
    assert key not in seen, key
    seen.add(key)

json.dump({"source": "turkiyeapi.dev dataset 2025 (TÜİK ADNKS)", "provinces": provinces, "districts": districts},
          open(dst, "w"), ensure_ascii=False, separators=(",", ":"))
print("ok", len(provinces), len(districts))
