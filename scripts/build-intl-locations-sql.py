"""src/data/locations-intl.json → supabase/migrations/20261024000001_multi_country_locations.sql

Deterministik: aynı girdi aynı SQL'i üretir. Kullanım: python3 -I scripts/build-intl-locations-sql.py
Migration mevcut Türkiye satırlarına dokunmaz; yalnızca kısıt gevşetir, sütun ve satır ekler.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(ROOT, "src/data/locations-intl.json"), encoding="utf-8"))
out = os.path.join(ROOT, "supabase/migrations/20261024000001_multi_country_locations.sql")

def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

lines = [
    "-- Çok ülkeli konum dizini: Hollanda (12 eyalet, 342 belediye) ve Almanya (16 eyalet, 400 Kreis).",
    "-- Üretildi: scripts/build-intl-locations-sql.py ← src/data/locations-intl.json. Elle düzenlemeyin.",
    "-- Kaynaklar: " + "; ".join(f"{s['country'].upper()}: {s['name']} ({s['license']})" for s in data["sources"]),
    "-- Mevcut Türkiye satırları değişmez. Konum kimliği (plate) ülke aralığındadır: TR 1–999, NL 1000–1999, DE 2000–2999.",
    "",
    "create table if not exists public.countries (",
    "  code text primary key check (code ~ '^[a-z]{2}$'),",
    "  plate_min smallint not null,",
    "  plate_max smallint not null,",
    "  name_tr text not null, name_en text not null, name_nl text not null, name_de text not null,",
    "  check (plate_min < plate_max)",
    ");",
    "alter table public.countries enable row level security;",
    "create policy \"public read countries\" on public.countries for select using (true);",
    "create policy \"admin all countries\" on public.countries for all to authenticated using (public.is_admin()) with check (public.is_admin());",
    "insert into public.countries (code, plate_min, plate_max, name_tr, name_en, name_nl, name_de) values",
    "  ('tr', 1, 999, 'Türkiye', 'Türkiye', 'Turkije', 'Türkei'),",
    ",\n".join(f"  ({q(c['code'])}, {c['plateBase']}, {c['plateBase'] + 999}, {q(c['names']['tr'])}, {q(c['names']['en'])}, {q(c['names']['nl'])}, {q(c['names']['de'])})" for c in data["countries"]),
    "on conflict (code) do nothing;",
    "",
    "-- Eski kısıt yalnızca Türkiye plakalarına (1–81) izin veriyordu.",
    "alter table public.cities drop constraint if exists cities_plate_check;",
    "alter table public.cities add constraint cities_plate_range check ((plate between 1 and 81) or (plate between 1001 and 1999) or (plate between 2001 and 2999));",
    "alter table public.cities add column if not exists country_code text generated always as (case when plate >= 2000 then 'de' when plate >= 1000 then 'nl' else 'tr' end) stored references public.countries (code);",
    "create index if not exists cities_country_idx on public.cities (country_code);",
    "",
    "insert into public.cities (plate, name, slug, region, is_metropolitan, is_coastal, population, lat, lng) values",
]
prov = sorted(data["provinces"], key=lambda p: p["plate"])
lines.append(",\n".join(
    f"  ({p['plate']}, {q(p['name'])}, {q(p['slug'])}, {q(p['region'])}, {q(p['metropolitan'])}, {q(p['coastal'])}, {q(p['population'])}, {q(p['lat'])}, {q(p['lng'])})"
    for p in prov))
lines.append("on conflict (plate) do nothing;")
lines.append("")
lines.append("insert into public.districts (city_id, name, slug, population)")
lines.append("select c.id, v.name, v.slug, v.population from (values")
dist = sorted(data["districts"], key=lambda d: (d["plate"], d["slug"]))
lines.append(",\n".join(f"  ({d['plate']}, {q(d['name'])}, {q(d['slug'])}, {q(d['population'])})" for d in dist))
lines.append(") as v(plate, name, slug, population)")
lines.append("join public.cities c on c.plate = v.plate")
lines.append("on conflict (city_id, slug) do nothing;")
lines.append("")
open(out, "w", encoding="utf-8").write("\n".join(lines))
print(out, len(prov), "bölge", len(dist), "yer")
