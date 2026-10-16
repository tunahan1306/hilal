import data from "@/data/locations.json";

export type Province = {
  plate: number;
  name: string;
  slug: string;
  region: string;
  metropolitan: boolean;
  coastal: boolean;
  population: number;
  lat: number;
  lng: number;
};

export type District = { plate: number; name: string; slug: string; population: number };

const provinces = (data.provinces as Province[]).slice();
const districts = (data.districts as District[])
  .slice()
  .sort((a, b) => a.plate - b.plate || a.name.localeCompare(b.name, "tr"));

const bySlug = new Map(provinces.map((p) => [p.slug, p]));
const byPlate = new Map(provinces.map((p) => [p.plate, p]));
const districtsByPlate = new Map<number, District[]>();
for (const d of districts) {
  const list = districtsByPlate.get(d.plate) ?? [];
  list.push(d);
  districtsByPlate.set(d.plate, list);
}

export const LOCATION_SOURCE = data.source;

export function listProvinces(): Province[] {
  return provinces.slice().sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function getProvince(slug: string): Province | undefined {
  return bySlug.get(slug);
}

export function getProvinceByPlate(plate: number): Province | undefined {
  return byPlate.get(plate);
}

export function listDistricts(plate: number): District[] {
  return districtsByPlate.get(plate) ?? [];
}

export function getDistrict(provinceSlug: string, districtSlug: string): District | undefined {
  const p = bySlug.get(provinceSlug);
  if (!p) return undefined;
  return listDistricts(p.plate).find((d) => d.slug === districtSlug);
}

export function districtCount(): number {
  return districts.length;
}

export const POPULAR_PROVINCE_SLUGS = [
  "istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir", "mugla", "trabzon",
] as const;
