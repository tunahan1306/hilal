import data from "@/data/locations.json";
import { createLocationDirectory } from "./location-directory";

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

/**
 * Paketlenmiş il/ilçe kataloğu (demo deposu ve testler). Arama mantığı veritabanı
 * kataloğuyla aynı `createLocationDirectory` uygulamasını kullanır; tek kaynak.
 */
const directory = createLocationDirectory({ provinces: data.provinces as Province[], districts: data.districts as District[] });

export const { listProvinces, getProvince, getProvinceByPlate, listDistricts, getDistrict } = directory;

export function districtCount(): number {
  return data.districts.length;
}
