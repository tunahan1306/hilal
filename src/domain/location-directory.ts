import type { Province, District } from "./locations";
export type LocationData = { provinces: Province[]; districts: District[] };
export const POPULAR_PROVINCE_SLUGS = ["istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir", "mugla", "trabzon"] as const;
/** Pure lookup over the supplied catalog; no bundled data or network fallback. */
export function createLocationDirectory(data: LocationData) {
  const bySlug = new Map(data.provinces.map((p) => [p.slug, p]));
  const byPlate = new Map(data.provinces.map((p) => [p.plate, p]));
  const listDistricts = (plate: number) => data.districts.filter((d) => d.plate === plate).sort((a,b) => a.name.localeCompare(b.name,"tr"));
  return {
    listProvinces: () => data.provinces.slice().sort((a,b) => a.name.localeCompare(b.name,"tr")),
    getProvince: (slug: string) => bySlug.get(slug),
    getProvinceByPlate: (plate: number) => byPlate.get(plate),
    listDistricts,
    getDistrict: (province: string, district: string) => { const p = bySlug.get(province); return p ? listDistricts(p.plate).find((d) => d.slug === district) : undefined; },
  };
}
