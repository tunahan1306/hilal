import type { Province, District } from "./locations";
export type LocationData = { provinces: Province[]; districts: District[] };
export const POPULAR_PROVINCE_SLUGS = ["istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir", "mugla", "trabzon"] as const;
/** Pure lookup over the supplied catalog; no bundled data or network fallback. */
export function createLocationDirectory(data: LocationData) {
  const bySlug = new Map(data.provinces.map((p) => [p.slug, p]));
  const byPlate = new Map(data.provinces.map((p) => [p.plate, p]));
  const byPlateDistricts = new Map<number, District[]>();
  for (const d of data.districts) byPlateDistricts.set(d.plate, [...(byPlateDistricts.get(d.plate) ?? []), d]);
  for (const list of byPlateDistricts.values()) list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const listDistricts = (plate: number) => (byPlateDistricts.get(plate) ?? []).slice();
  return {
    listProvinces: () => data.provinces.slice().sort((a,b) => a.name.localeCompare(b.name,"tr")),
    getProvince: (slug: string) => bySlug.get(slug),
    getProvinceByPlate: (plate: number) => byPlate.get(plate),
    listDistricts,
    getDistrict: (province: string, district: string) => { const p = bySlug.get(province); return p ? listDistricts(p.plate).find((d) => d.slug === district) : undefined; },
  };
}
