import "server-only";
import type { Metadata } from "next";
import { hasActiveFilters, parseFilters } from "@/domain/filters";
import type { District, Province } from "@/domain/locations";
import { shouldIndexListing, truncate } from "@/domain/seo";
import { SITE } from "@/lib/site";
import { getLocationSummary, getSeoPage } from "./public";

export async function locationMetadata(
  province: Province,
  district: District | undefined,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<Metadata> {
  const path = district ? `/sehir/${province.slug}/${district.slug}` : `/sehir/${province.slug}`;
  const [summary, seo] = await Promise.all([getLocationSummary(province.slug, district?.slug), getSeoPage(path)]);
  const filters = parseFilters(searchParams);
  const place = district ? `${district.name}, ${province.name}` : province.name;
  const index = shouldIndexListing({
    profileCount: summary.total,
    hasCuratedIntro: Boolean(seo?.intro),
    override: seo?.indexOverride ?? null,
    isFilteredVariant: hasActiveFilters({ ...filters, il: undefined }) || filters.sayfa > 1,
  });
  const title = seo?.title ?? `${place} sosyal profilleri`;
  const description =
    seo?.description ??
    truncate(
      seo?.intro ??
        `${place} bölgesindeki ${summary.total} doğrulanmış sosyal profili ilçe ve yaş aralığına göre keşfedin. Yalnızca 18+ ve rızası alınmış profiller.`,
    );
  return {
    title,
    description,
    alternates: { canonical: seo?.canonical ?? path },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: { title: `${title} | ${SITE.name}`, description, url: path },
  };
}
