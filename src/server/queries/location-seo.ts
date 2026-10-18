import "server-only";
import type { Metadata } from "next";
import { hasActiveFilters, parseFilters } from "@/domain/filters";
import type { District, Province } from "@/domain/locations";
import { shouldIndexListing, truncate } from "@/domain/seo";
import { fmt, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { i18nAlternates, i18nOpenGraph } from "@/i18n/metadata";
import { getLocationSummary, getSeoPage } from "./public";

/**
 * Yönetim panelindeki SEO kayıtlarının anahtarı. Türkiye için geriye dönük uyumlu
 * `/sehir/{il}[/{ilce}]`; diğer ülkeler için `/konum/{ülke}/{bölge}[/{yer}]`.
 * Elle yazılmış SEO metinleri Türkçedir ve yalnızca Türkçe sayfada kullanılır.
 */
export function seoKey(province: Province, district?: District): string {
  const tail = district ? `/${province.slug}/${district.slug}` : `/${province.slug}`;
  return province.country === "tr" ? `/sehir${tail}` : `/konum/${province.country}${tail}`;
}

export async function locationMetadata(
  lang: Locale,
  province: Province,
  district: District | undefined,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<Metadata> {
  const m = getMessages(lang);
  const [summary, seoRow] = await Promise.all([getLocationSummary(province.slug, district?.slug), getSeoPage(seoKey(province, district))]);
  const seo = lang === "tr" ? seoRow : null;
  const filters = parseFilters(searchParams);
  const place = district ? `${district.name}, ${province.name}` : province.name;
  const index = shouldIndexListing({
    profileCount: summary.total,
    hasCuratedIntro: Boolean(seo?.intro),
    override: seoRow?.indexOverride ?? null,
    isFilteredVariant: hasActiveFilters({ ...filters, il: undefined }) || filters.sayfa > 1,
  });
  const title = seo?.title ?? fmt(m.places.metaTitle, { place });
  const description = seo?.description ?? truncate(seo?.intro ?? fmt(m.places.metaDescription, { place }));
  const params = { country: province.country, region: province.slug, locality: district?.slug };
  const alternates = i18nAlternates(lang, "location", params);
  return {
    title,
    description,
    alternates: seo?.canonical ? { ...alternates, canonical: seo.canonical } : alternates,
    robots: index ? undefined : { index: false, follow: true },
    openGraph: i18nOpenGraph(lang, "location", params, title, description),
  };
}
