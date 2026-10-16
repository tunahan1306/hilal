import "server-only";
import { isSupabaseConfigured } from "./env";
/** Proxy validation uses the database; a backend failure must not become a false 404. */
export async function validLocation(province: string, district?: string): Promise<boolean | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(province) || (district && !/^[a-z0-9-]{1,80}$/.test(district))) return false;
  if (!isSupabaseConfigured()) {
    const { getProvince, getDistrict } = await import("@/domain/locations");
    return Boolean(getProvince(province) && (!district || getDistrict(province, district)));
  }
  const read = async (table: string, filters: Record<string,string>) => {
    const url = new URL(`/rest/v1/${table}`, process.env.NEXT_PUBLIC_SUPABASE_URL!);
    url.search = new URLSearchParams({ select: "id", limit: "1", ...filters }).toString();
    const response = await fetch(url, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Location lookup failed");
    return response.json() as Promise<{id:string}[]>;
  };
  try {
    const [city] = await read("cities", { slug: `eq.${province}` });
    if (!city) return false;
    return !district || (await read("districts", { city_id: `eq.${city.id}`, slug: `eq.${district}` })).length > 0;
  } catch { return null; }
}
