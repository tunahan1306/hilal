// Herkese açık depolama kovalarındaki sahipsiz dosyaları listeler (C-03, C-04).
// Varsayılan: yalnızca rapor (dry-run). Silmek için açıkça --delete verilmelidir.
//
// Kullanım (yalnızca yetkili kişi, önce staging):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/media-orphans.mjs
//   ... node scripts/media-orphans.mjs --delete
//
// "Sahipsiz": profile_media.public_paths / public_url / storage_path ile eşleşmeyen dosya.
// example_profiles.image_url ile eşleşen dosyalar da korunur.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(2);
}
const doDelete = process.argv.includes("--delete");
const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKETS = ["media-public", "profile-images"];
const LEGACY_PREFIX = "legacy-profile-images:";

async function all(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function listBucket(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // Klasörlerde id yoktur; alt klasörlere inilir.
      if (item.id === null) out.push(...(await listBucket(bucket, path)));
      else out.push(path);
    }
    if (data.length < 1000) return out;
  }
}

const media = await all("profile_media", "public_paths, public_url, public_poster_url, storage_path");
const examples = await all("example_profiles", "image_url").catch(() => []);
const referenced = { "media-public": new Set(), "profile-images": new Set() };
const pathFromUrl = (u, bucket) => {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = u?.indexOf(marker) ?? -1;
  return i >= 0 ? decodeURIComponent(u.slice(i + marker.length)) : null;
};
for (const m of media) {
  for (const p of m.public_paths ?? []) {
    if (p.startsWith(LEGACY_PREFIX)) referenced["profile-images"].add(p.slice(LEGACY_PREFIX.length));
    else referenced["media-public"].add(p);
  }
  referenced["profile-images"].add(m.storage_path);
  for (const u of [m.public_url, m.public_poster_url]) for (const b of BUCKETS) { const p = pathFromUrl(u, b); if (p) referenced[b].add(p); }
}
for (const e of examples) for (const b of BUCKETS) { const p = pathFromUrl(e.image_url, b); if (p) referenced[b].add(p); }

let total = 0;
for (const bucket of BUCKETS) {
  const files = await listBucket(bucket).catch((e) => { console.error(String(e)); return []; });
  const orphans = files.filter((f) => !referenced[bucket].has(f));
  total += orphans.length;
  console.log(`${bucket}: ${files.length} dosya, ${orphans.length} sahipsiz`);
  for (const o of orphans) console.log(`  ${o}`);
  if (doDelete && orphans.length) {
    for (let i = 0; i < orphans.length; i += 100) {
      const { error } = await db.storage.from(bucket).remove(orphans.slice(i, i + 100));
      if (error) { console.error(`${bucket} silme hatası: ${error.message}`); process.exit(1); }
    }
    console.log(`  → ${orphans.length} dosya silindi`);
  }
}
if (!doDelete && total) console.log("\nYalnızca rapor. Silmek için: --delete (önce yedek alın).");
