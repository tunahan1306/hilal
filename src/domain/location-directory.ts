import { COUNTRY_CODES, countryOfPlate, type CountryCode } from "./countries";
import type { Province, District } from "./locations";

/** Veri kaynağı ülke bilgisini taşımayabilir; ülke plakadan türetilir (tek kaynak: countries.ts). */
export type LocationData = { provinces: (Omit<Province, "country"> & { country?: CountryCode })[]; districts: District[] };

export const POPULAR_PROVINCE_SLUGS: Record<CountryCode, readonly string[]> = {
  tr: ["istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir", "mugla", "trabzon"],
  nl: ["noord-holland", "zuid-holland", "utrecht", "noord-brabant"],
  de: ["berlin", "bayern", "nordrhein-westfalen", "hamburg"],
};

/** Pure lookup over the supplied catalog; no bundled data or network fallback. */
export function createLocationDirectory(data: LocationData) {
  const provinces: Province[] = data.provinces.map((p) => ({ ...p, country: countryOfPlate(p.plate) }));
  const bySlug = new Map(provinces.map((p) => [p.slug, p]));
  const byPlate = new Map(provinces.map((p) => [p.plate, p]));
  const byPlateDistricts = new Map<number, District[]>();
  for (const d of data.districts) byPlateDistricts.set(d.plate, [...(byPlateDistricts.get(d.plate) ?? []), d]);
  for (const list of byPlateDistricts.values()) list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const listDistricts = (plate: number) => (byPlateDistricts.get(plate) ?? []).slice();
  const sorted = provinces.slice().sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return {
    /** Tüm ülkeler (ülke verilirse yalnızca o ülkenin bölgeleri), ada göre sıralı. */
    listProvinces: (country?: CountryCode) => (country ? sorted.filter((p) => p.country === country) : sorted.slice()),
    listCountries: () => COUNTRY_CODES.filter((c) => provinces.some((p) => p.country === c)),
    getProvince: (slug: string) => bySlug.get(slug),
    /** URL'deki ülke ile bölgenin ülkesi tutarlı olmalı. */
    getProvinceIn: (country: string, slug: string) => { const p = bySlug.get(slug); return p && p.country === country ? p : undefined; },
    getProvinceByPlate: (plate: number) => byPlate.get(plate),
    listDistricts,
    getDistrict: (province: string, district: string) => { const p = bySlug.get(province); return p ? listDistricts(p.plate).find((d) => d.slug === district) : undefined; },
  };
}
