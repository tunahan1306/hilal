// Ülke dizini. Konum kimliği (plate) ülke aralığına göre ayrılır: TR 1–999, NL 1000–1999, DE 2000–2999.
// Veritabanında aynı kural cities.country_code (plakadan üretilen sütun) olarak tutulur.
import type { Locale } from "@/i18n/config";

export const COUNTRY_CODES = ["tr", "nl", "de"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRIES: Record<CountryCode, { code: CountryCode; plateBase: number; names: Record<Locale, string>; showPlate: boolean }> = {
  tr: { code: "tr", plateBase: 0, names: { tr: "Türkiye", en: "Türkiye", nl: "Turkije", de: "Türkei" }, showPlate: true },
  nl: { code: "nl", plateBase: 1000, names: { tr: "Hollanda", en: "Netherlands", nl: "Nederland", de: "Niederlande" }, showPlate: false },
  de: { code: "de", plateBase: 2000, names: { tr: "Almanya", en: "Germany", nl: "Duitsland", de: "Deutschland" }, showPlate: false },
};

export function isCountry(v: unknown): v is CountryCode {
  return typeof v === "string" && (COUNTRY_CODES as readonly string[]).includes(v);
}

export function countryOfPlate(plate: number): CountryCode {
  return plate >= 2000 ? "de" : plate >= 1000 ? "nl" : "tr";
}

/** Ülkenin plaka aralığı [min, max] (keşif sorgularında ülke filtresi). */
export function plateRange(country: CountryCode): [number, number] {
  const base = COUNTRIES[country].plateBase;
  return [Math.max(1, base), base + 999];
}

export function countryName(country: CountryCode, lang: Locale): string {
  return COUNTRIES[country].names[lang];
}
