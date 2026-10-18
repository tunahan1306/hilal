import type { MetadataRoute } from "next";
import { getLocationDirectory } from "@/server/queries/locations";
import { shouldIndexListing } from "@/domain/seo";
import { siteUrl } from "@/lib/site";
import { getPublicProfileSlugs } from "@/server/queries/public";
import { getRepository } from "@/server/repositories";

/**
 * Yalnızca arama motorlarının gerçekten indeksleyebileceği sayfalar eklenir.
 * `/`, `/kesfet`, `/sehir/*` ve `/profil/*` yaş kapısının arkasındadır: çerezsiz
 * tarayıcılar `noindex` yaş onayı sayfasını görür (src/proxy.ts). Bu adresleri
 * sitemap'e koymak "gönderilen URL noindex" hatalarına yol açar; yaş kapısı
 * tarayıcıya içerik gösterecek şekilde yeniden tasarlanana kadar dışarıda kalırlar.
 * İl/ilçe/profil uygunluk kuralları `GATED_SITEMAP` açılırsa yeniden devreye girer.
 */
const GATED_SITEMAP = process.env.SITEMAP_INCLUDE_GATED === "true";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  const base = siteUrl();
  const staticPages = [...(GATED_SITEMAP ? ["/", "/kesfet"] : []), "/sehirler", "/guvenlik", "/paketler", "/kvkk", "/kullanim-kosullari", "/kaldirma-talebi", "/iletisim"].map((p) => ({
    url: `${base}${p === "/" ? "" : p}`,
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1 : 0.6,
  }));
  if (!GATED_SITEMAP) return staticPages;

  const { getProvinceByPlate, listProvinces } = await getLocationDirectory();
  const [counts, slugs, seoPages] = await Promise.all([getRepository().countPublishedByLocation(), getPublicProfileSlugs(), getRepository().listSeoPages()]);
  const seoByPath = new Map(seoPages.map((s) => [s.path, s]));
  const indexable = (path: string, count: number) => {
    const seo = seoByPath.get(path);
    return shouldIndexListing({ profileCount: count, hasCuratedIntro: Boolean(seo?.intro), override: seo?.indexOverride ?? null });
  };


  const cities = listProvinces()
    .map((p) => ({ p, count: counts.find((c) => c.plate === p.plate && c.districtSlug === null)?.count ?? 0 }))
    .filter(({ p, count }) => indexable(`/sehir/${p.slug}`, count))
    .map(({ p }) => ({ url: `${base}/sehir/${p.slug}`, changeFrequency: "daily" as const, priority: 0.8 }));

  const districts = counts
    .filter((c) => c.districtSlug)
    .map((c) => ({ path: `/sehir/${getProvinceByPlate(c.plate)!.slug}/${c.districtSlug}`, count: c.count }))
    .filter(({ path, count }) => indexable(path, count))
    .map(({ path }) => ({ url: `${base}${path}`, changeFrequency: "daily" as const, priority: 0.6 }));

  const profiles = slugs.map((s) => ({ url: `${base}/profil/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "weekly" as const, priority: 0.5 }));

  return [...staticPages, ...cities, ...districts, ...profiles];
}
