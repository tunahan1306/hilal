import data from "@/data/locations.json";
import intl from "@/data/locations-intl.json";
import type { CountryCode } from "./countries";
import { createLocationDirectory } from "./location-directory";

export type Province = {
  /** Plakadan türetilir (countries.ts). */
  country: CountryCode;
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

/**
 * Paketlenmiş il/ilçe kataloğu (demo deposu ve testler). Arama mantığı veritabanı
 * kataloğuyla aynı `createLocationDirectory` uygulamasını kullanır; tek kaynak.
 */
const directory = createLocationDirectory({
  provinces: [...(data.provinces as Omit<Province, "country">[]), ...(intl.provinces as Omit<Province, "country">[])],
  districts: [...(data.districts as District[]), ...(intl.districts as District[])],
});

export const { listProvinces, listCountries, getProvince, getProvinceIn, getProvinceByPlate, listDistricts, getDistrict } = directory;

/** Türkiye ilçe sayısı (resmî 973). */
export function districtCount(): number {
  return data.districts.length;
}

export const LOCATION_SOURCES = [{ country: "tr", name: data.source }, ...intl.sources];
