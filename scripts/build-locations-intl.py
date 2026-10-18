"""Builds src/data/locations-intl.json (Netherlands + Germany) from cached raw downloads.

Usage: python3 -I scripts/build-locations-intl.py <raw_dir> <out_file>

Expected files in <raw_dir> (fetch once, then the build is offline and deterministic):
  nl_gin2026.json   CBS StatLine 86247NED "Gebieden in Nederland 2026" (CC BY 4.0)
                    https://opendata.cbs.nl/ODataApi/odata/86247NED/TypedDataSet?$format=json
                    -> 342 gemeenten on 1 Jan 2026, province, landsdeel, Inwonertal (1 Jan 2026)
  de_kreise.xlsx    Destatis GV-ISys "Kreisfreie Städte und Landkreise nach Fläche, Bevölkerung
                    und Bevölkerungsdichte", Gebietsstand 31.12.2024 (published Sep 2025)
                    https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/04-kreise.xlsx?__blob=publicationFile
                    -> 400 Kreise (294 Landkreise/Kreise + 106 kreisfreie Städte), population 31.12.2024
  wd_provinces.json Wikidata SPARQL (CC0): NL provinces + DE Länder by ISO 3166-2 (P300),
                    with capital (P36, current) coordinates and the item's own P625.
                    Province lat/lng = capital coordinates; Berlin/Hamburg (no P36) = item P625.

Only the Python standard library is used (xlsx parsed via zipfile + ElementTree).
"""
import json, os, sys, unicodedata, zipfile
import xml.etree.ElementTree as ET

RETRIEVED = "2026-10-18"

FOLD = str.maketrans({
    "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "ae", "Ö": "oe", "Ü": "ue",
    "é": "e", "è": "e", "ê": "e", "ë": "e", "É": "e", "á": "a", "à": "a", "â": "a",
    "í": "i", "ì": "i", "î": "i", "ï": "i", "ó": "o", "ò": "o", "ô": "o",
    "ú": "u", "ù": "u", "û": "u", "ç": "c", "ĳ": "ij", "Ĳ": "ij",
    # Turkish letters, same as scripts/build-locations.py
    "ğ": "g", "ı": "i", "İ": "i", "ş": "s", "Ç": "c", "Ğ": "g", "Ş": "s",
})


def slug(s):
    s = s.translate(FOLD)
    s = "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))
    s = s.lower()
    out, dash = [], False
    for ch in s:
        if ch.isalnum() and ch.isascii():
            out.append(ch); dash = False
        elif not dash:
            out.append("-"); dash = True
    r = "".join(out).strip("-")
    assert r and r.isascii(), (s, r)
    return r


def pt(wkt):
    # "Point(lng lat)"
    lng, lat = wkt[wkt.index("(") + 1:wkt.index(")")].split()
    return round(float(lat), 5), round(float(lng), 5)


def read_xlsx(path, sheet):
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    tag = "{%s}" % ns["m"]
    z = zipfile.ZipFile(path)
    ss = [''.join(t.text or '' for t in si.iter(tag + "t"))
          for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns)]
    rows = []
    for row in ET.fromstring(z.read(sheet)).iter(tag + "row"):
        cells = {}
        for c in row.findall("m:c", ns):
            v = c.find("m:v", ns)
            val = v.text if v is not None else ''.join(x.text or '' for x in c.iter(tag + "t"))
            if c.get("t") == "s":
                val = ss[int(val)]
            col = ''.join(ch for ch in c.get("r") if ch.isalpha())
            cells[col] = (val or "").strip()
        rows.append(cells)
    return rows


raw, dst = sys.argv[1], sys.argv[2]

# ---------- Wikidata province/Land coordinates ----------
wd = {}
for b in json.load(open(os.path.join(raw, "wd_provinces.json"), encoding="utf-8"))["results"]["bindings"]:
    iso = b["iso"]["value"]
    if "capCoord" in b:
        c = pt(b["capCoord"]["value"])
    else:
        c = pt(b["coord"]["value"])
    # deterministic: if several capital rows exist keep the smallest tuple
    wd[iso] = min(wd.get(iso, c), c)
assert len(wd) == 28, len(wd)

# ---------- Netherlands (CBS) ----------
NL_ISO = {"Drenthe": "NL-DR", "Flevoland": "NL-FL", "Fryslân": "NL-FR", "Gelderland": "NL-GE",
          "Groningen": "NL-GR", "Limburg": "NL-LI", "Noord-Brabant": "NL-NB", "Noord-Holland": "NL-NH",
          "Overijssel": "NL-OV", "Utrecht": "NL-UT", "Zeeland": "NL-ZE", "Zuid-Holland": "NL-ZH"}
NL_COASTAL = {"Groningen", "Fryslân", "Noord-Holland", "Zuid-Holland", "Zeeland"}  # North Sea / Wadden Sea
NL_METRO = {"Noord-Holland", "Zuid-Holland", "Utrecht"}

gin = json.load(open(os.path.join(raw, "nl_gin2026.json"), encoding="utf-8"))
assert not gin.get("odata.nextLink")
nl_rows = [{k: (v.strip() if isinstance(v, str) else v) for k, v in r.items()} for r in gin["value"]]
assert len(nl_rows) == 342, len(nl_rows)
assert len({r["Code_1"] for r in nl_rows}) == 342
nl_prov = {}
for r in nl_rows:
    assert r["Code_1"].startswith("GM") and r["Naam_2"], r
    p = r["Naam_29"]
    reg = nl_prov.setdefault(p, {"region": r["Naam_27"], "pop": 0, "munis": []})
    assert reg["region"] == r["Naam_27"], (p, r["Naam_27"])
    assert isinstance(r["Inwonertal_56"], int) and r["Inwonertal_56"] > 0, r
    reg["pop"] += r["Inwonertal_56"]
    reg["munis"].append((r["Naam_2"], r["Inwonertal_56"]))
assert set(nl_prov) == set(NL_ISO), sorted(nl_prov)
assert {v["region"] for v in nl_prov.values()} == {"Noord-Nederland", "Oost-Nederland", "West-Nederland", "Zuid-Nederland"}

# ---------- Germany (Destatis) ----------
DE_ISO = {"01": "DE-SH", "02": "DE-HH", "03": "DE-NI", "04": "DE-HB", "05": "DE-NW", "06": "DE-HE",
          "07": "DE-RP", "08": "DE-BW", "09": "DE-BY", "10": "DE-SL", "11": "DE-BE", "12": "DE-BB",
          "13": "DE-MV", "14": "DE-SN", "15": "DE-ST", "16": "DE-TH"}
DE_COASTAL = {"01", "02", "03", "04", "13"}
DE_METRO = {"02", "04", "11"}
CITY_TYPES = {"Kreisfreie Stadt", "Stadtkreis"}
KREIS_TYPES = {"Landkreis", "Kreis", "Regionalverband"}
# official appellations appended after ", " in the Destatis name (dropped for display)
CITY_SUFFIXES = {"Stadt", "kreisfreie Stadt", "Stadtkreis", "Landeshauptstadt", "Hansestadt",
                 "Freie und Hansestadt", "Klingenstadt", "Stadt der FernUniversität",
                 "Wissenschaftsstadt", "documenta-Stadt"}

rows = read_xlsx(os.path.join(raw, "de_kreise.xlsx"), "xl/worksheets/sheet2.xml")
assert rows[0].get("A", "").startswith("Kreisfreie Städte und Landkreise") and "31.12.2024" in rows[0]["A"], rows[0]
de_land, de_kreise = {}, []
for r in rows:
    code = r.get("A", "")
    if not code.isdigit():
        continue
    if len(code) == 2:
        de_land[code] = r["B"]
    elif len(code) == 5:
        typ, name, pop = r["B"], r["C"], int(r["F"])
        assert typ in CITY_TYPES | KREIS_TYPES, (code, typ)
        if typ in CITY_TYPES:
            if ", " in name:
                base, suf = name.split(", ", 1)
                assert suf in CITY_SUFFIXES, (code, name)
                name = base
        else:
            low = name.lower()
            if not ("kreis" in low or low.startswith(("region ", "städteregion ", "regionalverband ", "landkreis "))):
                name = typ + " " + name
        de_kreise.append({"ags": code, "land": code[:2], "type": typ, "name": name, "pop": pop})
assert set(de_land) == set(DE_ISO), sorted(de_land)
assert len(de_kreise) == 400, len(de_kreise)
assert len({k["ags"] for k in de_kreise}) == 400
n_city = sum(k["type"] in CITY_TYPES for k in de_kreise)
assert (n_city, 400 - n_city) == (106, 294), n_city

# ---------- assemble ----------
provinces, districts = [], []

def add_country(code, base, items):
    # items: list of dict(name, region, metropolitan, coastal, population, lat, lng, districts=[(name,pop)])
    items = sorted(items, key=lambda x: (slug(x["name"]), x["name"]))
    pslugs = set()
    for i, it in enumerate(items, 1):
        plate = base + i
        s = slug(it["name"])
        assert s not in pslugs, s
        pslugs.add(s)
        provinces.append({"country": code, "plate": plate, "name": it["name"], "slug": s,
                          "region": it["region"], "metropolitan": it["metropolitan"],
                          "coastal": it["coastal"], "population": it["population"],
                          "lat": it["lat"], "lng": it["lng"]})
        dslugs = set()
        for dn, dp in sorted(it["districts"], key=lambda x: (slug(x[0]), x[0])):
            ds = slug(dn)
            assert ds not in dslugs, (it["name"], ds)
            dslugs.add(ds)
            districts.append({"plate": plate, "name": dn, "slug": ds, "population": dp})

nl_items = []
for p, v in nl_prov.items():
    lat, lng = wd[NL_ISO[p]]
    nl_items.append({"name": p, "region": v["region"], "metropolitan": p in NL_METRO,
                     "coastal": p in NL_COASTAL, "population": v["pop"], "lat": lat, "lng": lng,
                     "districts": v["munis"]})
add_country("nl", 1000, nl_items)

de_items = []
for c, n in de_land.items():
    ks = [k for k in de_kreise if k["land"] == c]
    lat, lng = wd[DE_ISO[c]]
    de_items.append({"name": n, "region": "Deutschland", "metropolitan": c in DE_METRO,
                     "coastal": c in DE_COASTAL, "population": sum(k["pop"] for k in ks),
                     "lat": lat, "lng": lng, "districts": [(k["name"], k["pop"]) for k in ks]})
add_country("de", 2000, de_items)

# ---------- checks ----------
nlp = [p for p in provinces if p["country"] == "nl"]
dep = [p for p in provinces if p["country"] == "de"]
assert len(nlp) == 12 and [p["plate"] for p in nlp] == list(range(1001, 1013))
assert len(dep) == 16 and [p["plate"] for p in dep] == list(range(2001, 2017))
plates = {p["plate"] for p in provinces}
assert all(d["plate"] in plates for d in districts)
assert sum(1001 <= d["plate"] <= 1012 for d in districts) == 342
assert sum(2001 <= d["plate"] <= 2016 for d in districts) == 400
assert all(x["name"].strip() and x["slug"] for x in provinces + districts)
assert all(-90 <= p["lat"] <= 90 and -180 <= p["lng"] <= 180 for p in provinces)
for c in ("nl", "de"):
    assert sum(p["country"] == c and p["metropolitan"] for p in provinces) == 3
    assert sum(p["country"] == c and p["coastal"] for p in provinces) == 5
by = {(p["country"], p["name"]): p["plate"] for p in provinces}
dn = {(d["plate"], d["name"]) for d in districts}
for chk in [(("de", "Bayern"), "München"), (("de", "Bayern"), "Landkreis München"),
            (("de", "Bremen"), "Bremen"), (("de", "Bremen"), "Bremerhaven"),
            (("de", "Berlin"), "Berlin"), (("de", "Hamburg"), "Hamburg"), (("nl", "Drenthe"), "Assen")]:
    assert (by[chk[0]], chk[1]) in dn, chk

out = {
    "sources": [
        {"country": "nl", "name": "CBS StatLine 86247NED – Gebieden in Nederland 2026 (gemeentelijke indeling 1 januari 2026, inwonertal 1 januari 2026)",
         "url": "https://opendata.cbs.nl/statline/#/CBS/nl/dataset/86247NED", "license": "CC BY 4.0", "retrieved": RETRIEVED},
        {"country": "de", "name": "Statistisches Bundesamt (Destatis), GV-ISys: Kreisfreie Städte und Landkreise nach Fläche, Bevölkerung und Bevölkerungsdichte, Gebietsstand 31.12.2024 (Bevölkerung auf Grundlage des Zensus 2022)",
         "url": "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/04-kreise.html",
         "license": "Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0); © Statistisches Bundesamt (Destatis), 2025", "retrieved": RETRIEVED},
        {"country": "nl", "name": "Wikidata (province capital coordinates)", "url": "https://query.wikidata.org/", "license": "CC0 1.0", "retrieved": RETRIEVED},
        {"country": "de", "name": "Wikidata (Land capital coordinates; Berlin/Hamburg item coordinates)", "url": "https://query.wikidata.org/", "license": "CC0 1.0", "retrieved": RETRIEVED},
    ],
    "countries": [
        {"code": "nl", "plateBase": 1000, "names": {"tr": "Hollanda", "en": "Netherlands", "nl": "Nederland", "de": "Niederlande"}},
        {"code": "de", "plateBase": 2000, "names": {"tr": "Almanya", "en": "Germany", "nl": "Duitsland", "de": "Deutschland"}},
    ],
    "provinces": provinces,
    "districts": districts,
}
with open(dst, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    f.write("\n")
print(f"provinces={len(provinces)} (nl={len(nlp)}, de={len(dep)}) districts={len(districts)} -> {dst}")
