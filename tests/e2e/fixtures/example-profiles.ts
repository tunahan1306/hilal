/**
 * examples.spec için YEREL test verisi. Production'daki kurgusal profillerden bağımsızdır:
 * adlar, konumlar ve görseller sentetiktir (düz renk görsel), telefon numarası atanmamış bir
 * test numarasıdır. Yalnızca 127.0.0.1/localhost Supabase'e yazar; aksi halde hata verir.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

/** Türkiye'de tahsis edilmemiş 0500 öneki; gerçek bir aboneye ait değildir. */
export const FIXTURE_WHATSAPP = "905000000000";
export const FIXTURE_PREFIX = "kurgu-kadin-fixture-";

export const FIXTURES = [
  { key: "ece", nickname: "Ece", plate: 34, district: "atasehir" },
  { key: "elif", nickname: "Elif", plate: 35, district: "karsiyaka" },
  { key: "selin", nickname: "Selin", plate: 34, district: "beyoglu" },
  { key: "melis", nickname: "Melis", plate: 34, district: "sisli" },
  { key: "naz", nickname: "Naz", plate: 34, district: "kadikoy" },
  { key: "asli", nickname: "Aslı", plate: 34, district: "besiktas" },
  { key: "defne", nickname: "Defne", plate: 6, district: "cankaya" },
  { key: "derya", nickname: "Derya", plate: 7, district: "muratpasa" },
  { key: "ipek", nickname: "İpek", plate: 16, district: "nilufer" },
  { key: "zeynep", nickname: "Zeynep", plate: 35, district: "bornova" },
] as const;

export const slugOf = (key: string) => `${FIXTURE_PREFIX}${key}`;

function localClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) throw new Error("Fixture yalnızca yerel Supabase'e yazılabilir");
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function seedExampleFixtures() {
  const db = localClient();
  await cleanupExampleFixtures();
  const { data: cities, error: ce } = await db.from("cities").select("id, plate").in("plate", [...new Set(FIXTURES.map((f) => f.plate))]);
  if (ce) throw ce;
  const cityId = new Map(cities!.map((c) => [c.plate as number, c.id as string]));
  const { data: districts, error: de } = await db.from("districts").select("id, city_id, slug").in("slug", FIXTURES.map((f) => f.district));
  if (de) throw de;
  const image = await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#6b4a5e" } }).webp({ quality: 60 }).toBuffer();
  for (const [i, f] of FIXTURES.entries()) {
    const city = cityId.get(f.plate)!;
    const district = districts!.find((d) => d.city_id === city && d.slug === f.district)?.id ?? null;
    const slug = slugOf(f.key);
    const bio = `Sentetik test profili (${f.nickname}); yalnızca yerel uçtan uca testler için oluşturuldu.`;
    const { data: p, error: pe } = await db.from("profiles").insert({ slug: `${slug}-src`, nickname: f.nickname, birth_date: "1995-05-05", city_id: city, district_id: district, bio }).select("id").single();
    if (pe) throw pe;
    const path = `${slug}.webp`;
    const up = await db.storage.from("media-public").upload(path, image, { contentType: "image/webp", upsert: true });
    if (up.error) throw up.error;
    const imageUrl = db.storage.from("media-public").getPublicUrl(path).data.publicUrl;
    const { error: ee } = await db.from("example_profiles").insert({
      id: p.id, slug, nickname: f.nickname, birth_date: "1995-05-05", city_id: city, district_id: district, bio,
      image_url: imageUrl, image_width: 800, image_height: 1000,
      whatsapp_phone: FIXTURE_WHATSAPP, contact_authorized_at: new Date().toISOString(),
      published_at: new Date(Date.now() - i * 60_000).toISOString(),
    });
    if (ee) throw ee;
  }
}

export async function cleanupExampleFixtures() {
  const db = localClient();
  await db.from("example_profiles").delete().like("slug", `${FIXTURE_PREFIX}%`);
  await db.from("profiles").delete().like("slug", `${FIXTURE_PREFIX}%`);
  await db.storage.from("media-public").remove(FIXTURES.map((f) => `${slugOf(f.key)}.webp`));
}
