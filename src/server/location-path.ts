import "server-only";
import { isSupabaseConfigured } from "./env";
/** Kısa ömürlü süreç içi önbellek: proxy her istekte veritabanına gitmesin (C-13). Hatalar önbelleklenmez. */
const TTL_MS = { location: 10 * 60_000, profile: 30_000 };
const memo = new Map<string, { value: boolean; at: number }>();
async function cached(key: string, ttl: number, fn: () => Promise<boolean | null>): Promise<boolean | null> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = await fn();
  if (value !== null) {
    if (memo.size >= 2000) memo.delete(memo.keys().next().value!);
    memo.set(key, { value, at: Date.now() });
  }
  return value;
}

async function restRead(table: string, filters: Record<string, string>) {
  const url = new URL(`/rest/v1/${table}`, process.env.NEXT_PUBLIC_SUPABASE_URL!);
  url.search = new URLSearchParams({ select: "id", limit: "1", ...filters }).toString();
  const response = await fetch(url, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Lookup failed");
  return response.json() as Promise<{ id: string }[]>;
}

/**
 * Kamuya açık profil var mı? Suspense içindeki notFound() 200 döndürdüğü için gerçek
 * 404 durumu proxy'de üretilir (C-19). Arka uç hatası null döner (yanlış 404 üretilmez).
 */
export async function validPublicProfile(slug: string): Promise<boolean | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return false;
  return cached(`p:${slug}`, TTL_MS.profile, async () => {
    if (!isSupabaseConfigured()) {
      const { getRepository } = await import("./repositories");
      return (await getRepository().getPublicProfile(slug)) !== null;
    }
    try { return (await restRead("discovery_profiles", { slug: `eq.${slug}` })).length > 0; } catch { return null; }
  });
}

/** Proxy validation uses the database; a backend failure must not become a false 404. */
export async function validLocation(province: string, district?: string): Promise<boolean | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(province) || (district && !/^[a-z0-9-]{1,80}$/.test(district))) return false;
  return cached(`l:${province}/${district ?? ""}`, TTL_MS.location, () => lookupLocation(province, district));
}

async function lookupLocation(province: string, district?: string): Promise<boolean | null> {
  if (!isSupabaseConfigured()) {
    const { getProvince, getDistrict } = await import("@/domain/locations");
    return Boolean(getProvince(province) && (!district || getDistrict(province, district)));
  }
  const read = restRead;
  try {
    const [city] = await read("cities", { slug: `eq.${province}` });
    if (!city) return false;
    return !district || (await read("districts", { city_id: `eq.${city.id}`, slug: `eq.${district}` })).length > 0;
  } catch { return null; }
}
