// supabase/seed.sql üretir: 81 il, 973 ilçe, ilgi alanları ve üyelik paketleri.
// Profil verisi EKLENMEZ — gerçek profiller yalnızca yönetim panelinden, rıza ile oluşturulur.
import { readFile, writeFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../src/data/locations.json", import.meta.url), "utf8"));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lines = ["-- Otomatik üretildi: node scripts/build-seed-sql.mjs", "begin;"];

lines.push("insert into cities (plate, name, slug, region, is_metropolitan, population, lat, lng) values");
lines.push(
  data.provinces
    .map((p) => `(${p.plate}, ${q(p.name)}, ${q(p.slug)}, ${q(p.region)}, ${p.metropolitan}, ${p.population}, ${p.lat}, ${p.lng})`)
    .join(",\n") + "\non conflict (plate) do nothing;",
);
lines.push("insert into districts (city_id, name, slug, population)");
lines.push("select c.id, v.name, v.slug, v.population from (values");
lines.push(data.districts.map((d) => `(${d.plate}, ${q(d.name)}, ${q(d.slug)}, ${d.population})`).join(",\n"));
lines.push(") as v(plate, name, slug, population) join cities c on c.plate = v.plate on conflict (city_id, slug) do nothing;");

const interests = [
  ["kahve-sohbetleri", "Kahve sohbetleri"], ["doga-yuruyusu", "Doğa yürüyüşü"], ["fotografcilik", "Fotoğrafçılık"],
  ["sinema", "Sinema"], ["kitap-kulubu", "Kitap kulübü"], ["canli-muzik", "Canlı müzik"], ["seyahat", "Seyahat"],
  ["bisiklet", "Bisiklet"], ["yemek-kulturu", "Yemek kültürü"], ["yoga", "Yoga"], ["tiyatro", "Tiyatro"],
  ["gonulluluk", "Gönüllülük"], ["kamp", "Kamp"], ["satranc", "Satranç"], ["dil-degisimi", "Dil değişimi"], ["kosu", "Koşu"],
];
lines.push("insert into interests (slug, name) values");
lines.push(interests.map(([s, n]) => `(${q(s)}, ${q(n)})`).join(",\n") + "\non conflict (slug) do nothing;");

lines.push(`insert into membership_plans (code, name, description, max_photos, sponsored_eligible, advanced_stats, customization) values
('basic', 'Basic', 'Standart profil görünürlüğü ve temel profil özellikleri.', 3, false, false, false),
('plus', 'Plus', 'Geliştirilmiş profil sunumu, ek fotoğraf kapasitesi ve sponsorlu görünürlük seçeneği.', 6, true, false, false),
('premium', 'Premium', 'Gelişmiş profil kişiselleştirme, sponsorlu alanlar ve ilave istatistikler.', 10, true, true, true)
on conflict (code) do nothing;`);
lines.push("commit;");
await writeFile(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n") + "\n");
console.log("ok");
