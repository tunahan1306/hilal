import type { MetadataRoute } from "next";
import { COUNTRY_CODES } from "@/domain/countries";
import { shouldIndexListing } from "@/domain/seo";
import { LOCALES, X_DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localizedPath, type RouteKey, type RouteParams } from "@/i18n/routes";
import { siteUrl } from "@/lib/site";
import { getLocationDirectory } from "@/server/queries/locations";
import { seoKey } from "@/server/queries/location-seo";
import { getPublicProfileSlugs } from "@/server/queries/public";
import { getRepository } from "@/server/repositories";

/**
 * Yalnızca arama motorlarının gerçekten indeksleyebileceği sayfalar eklenir; her adres
 * diğer dillerdeki karşılıklarıyla (hreflang) birlikte listelenir.
 * Ana sayfa, keşif, bölge/yer ve profil sayfaları yaş kapısının arkasındadır: çerezsiz
 * tarayıcı `noindex` yaş onayı sayfasını görür (src/proxy.ts). Bunlar `SITEMAP_INCLUDE_GATED`
 * açılmadıkça sitemap'e girmez. Hukuki metinler yalnızca Türkçedir (diğer dillerde noindex).
 */
const GATED_SITEMAP = process.env.SITEMAP_INCLUDE_GATED === "true";

type Entry = MetadataRoute.Sitemap[number];

function entries<K extends RouteKey>(route: K, params: K extends keyof RouteParams ? RouteParams[K] : undefined, opts: Partial<Entry> & { locales?: readonly Locale[] } = {}): Entry[] {
  const base = siteUrl();
  const path = (l: Locale) => (localizedPath as (l: Locale, r: RouteKey, p?: unknown) => string)(l, route, params);
  const locales = opts.locales ?? LOCALES;
  const languages: Record<string, string> = Object.fromEntries(locales.map((l) => [l, `${base}${path(l)}`]));
  if (locales.includes(X_DEFAULT_LOCALE)) languages["x-default"] = `${base}${path(X_DEFAULT_LOCALE)}`;
  const { locales: _omit, ...rest } = opts;
  void _omit;
  return locales.map((l) => ({ url: `${base}${path(l)}`, changeFrequency: "weekly", priority: 0.6, ...rest, alternates: { languages } }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  const ungated: Entry[] = [
    ...entries("cities", undefined, { priority: 0.8 }),
    ...COUNTRY_CODES.flatMap((country) => entries("location", { country }, { priority: 0.8 })),
    ...entries("safety", undefined),
    ...entries("packages", undefined),
    ...entries("removal", undefined),
    ...entries("contact", undefined),
    ...entries("privacy", undefined, { locales: ["tr"] }),
    ...entries("terms", undefined, { locales: ["tr"] }),
  ];
  if (!GATED_SITEMAP) return ungated;

  const { getProvinceByPlate, listProvinces } = await getLocationDirectory();
  const [counts, slugs, seoPages] = await Promise.all([getRepository().countPublishedByLocation(), getPublicProfileSlugs(), getRepository().listSeoPages()]);
  const seoByPath = new Map(seoPages.map((s) => [s.path, s]));
  const indexable = (key: string, count: number) => {
    const seo = seoByPath.get(key);
    return shouldIndexListing({ profileCount: count, hasCuratedIntro: Boolean(seo?.intro), override: seo?.indexOverride ?? null });
  };
  const regions = listProvinces()
    .filter((p) => indexable(seoKey(p), counts.find((c) => c.plate === p.plate && c.districtSlug === null)?.count ?? 0))
    .flatMap((p) => entries("location", { country: p.country, region: p.slug }, { changeFrequency: "daily", priority: 0.8 }));
  const localities = counts
    .filter((c) => c.districtSlug)
    .map((c) => ({ p: getProvinceByPlate(c.plate)!, slug: c.districtSlug!, count: c.count }))
    .filter(({ p, slug, count }) => indexable(seoKey(p, { plate: p.plate, slug, name: slug, population: 0 }), count))
    .flatMap(({ p, slug }) => entries("location", { country: p.country, region: p.slug, locality: slug }, { changeFrequency: "daily" }));
  const profiles = slugs.flatMap((s) => entries("profile", { slug: s.slug }, { lastModified: s.updatedAt, priority: 0.5 }));
  return [...entries("home", undefined, { priority: 1 }), ...entries("explore", undefined), ...ungated, ...regions, ...localities, ...profiles];
}
