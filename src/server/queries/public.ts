import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { ProfileFilters } from "@/domain/filters";
import { PAGE_SIZE } from "@/domain/filters";
import { ISTANBUL_SIDES } from "@/domain/istanbul";
import { toCardProfile } from "@/domain/types";
import { TAGS } from "../cache";
import { getRepository } from "../repositories";

/**
 * Profile reads run at request time so direct database changes need no deploy.
 * Reference data and SEO keep their separately tagged caches.
 */

export async function getFeaturedProfiles(limit = 8) {
  await connection();
  return getRepository().listFeaturedProfiles(limit);
}

export async function searchProfiles(filters: ProfileFilters) {
  await connection();
  const offset = (filters.sayfa - 1) * PAGE_SIZE;
  return getRepository().searchPublicProfiles(filters, { limit: PAGE_SIZE, offset });
}

/** Aynı istekte metadata ve sayfa aynı sonucu paylaşır (tek veritabanı okuması). */
export const getPublicProfile = cache(async (slug: string) => {
  await connection();
  return getRepository().getPublicProfile(slug);
});

/** İl/ilçe sayımları istek başına bir kez okunur (sayfa, metadata ve özet paylaşır). */
export const getLocationCounts = cache(async () => {
  await connection();
  return getRepository().countPublishedByLocation();
});

export async function getPublicProfileSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.public);
  return getRepository().listPublicProfileSlugs();
}

export async function getInterests() {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.interests);
  return getRepository().listInterests();
}

export async function getSeoPage(path: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.seo);
  return getRepository().getSeoPage(path);
}

export async function getPlans() {
  "use cache";
  cacheLife("days");
  return getRepository().listPlans();
}

export function profileCountFor(counts: Awaited<ReturnType<typeof getLocationCounts>>, plate: number, districtSlug: string | null = null) {
  return counts.find((c) => c.plate === plate && c.districtSlug === districtSlug)?.count ?? 0;
}

/** İl/ilçe sayfası için veri odaklı özet (özgün içerik üretimi için). */
export async function getLocationSummary(il: string, ilce?: string) {
  await connection();
  const counts = await getLocationCounts();
  const { getLocationDirectory } = await import("./locations");
  const { getProvince, listDistricts } = await getLocationDirectory();
  const province = getProvince(il);
  const total = province ? profileCountFor(counts, province.plate, ilce ?? null) : 0;
  return { total, districts: province ? listDistricts(province.plate).map((d) => ({ slug: d.slug, name: d.name, count: profileCountFor(counts, province.plate, d.slug) })).filter((d) => d.count > 0) : [] };

}

/** Bounded keyset read; no offset drift during progressive discovery. */
export async function discoverProfiles(filters: ProfileFilters, cursor?: import("@/domain/discovery-cursor").DiscoveryCursor) {
  await connection();
  const { encodeCursor } = await import("@/domain/discovery-cursor");
  const result = await getRepository().searchPublicProfiles({ ...filters, ilgi: [], sayfa: 1 }, { limit: PAGE_SIZE + 1, offset: 0, cursor });
  const items = result.items.slice(0, PAGE_SIZE);
  const last = items.at(-1);
  return { items: items.map(toCardProfile), total: result.total, nextCursor: result.items.length > PAGE_SIZE && last?.publishedAt ? encodeCursor({ publishedAt: last.publishedAt, id: last.id }) : null };
}

/** İstanbul yakalarının profil sayıları (ilçe sayımlarının toplamı). */
export function istanbulSideCounts(counts: Awaited<ReturnType<typeof getLocationCounts>>) {
  const plate = 34;
  const sum = (districts: readonly string[]) => districts.reduce((n, d) => n + profileCountFor(counts, plate, d), 0);
  return { avrupa: sum(ISTANBUL_SIDES.avrupa.districts), anadolu: sum(ISTANBUL_SIDES.anadolu.districts) };
}
