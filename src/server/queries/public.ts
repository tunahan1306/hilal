import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { ProfileFilters } from "@/domain/filters";
import { PAGE_SIZE } from "@/domain/filters";
import { TAGS } from "../cache";
import { getRepository } from "../repositories";

/**
 * Kamuya açık, önbelleğe alınmış okumalar. Yönetim işlemleri `invalidatePublic()`
 * ile bu etiketleri anında geçersiz kılar.
 */

export async function getFeaturedProfiles(limit = 8) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.public);
  return getRepository().listFeaturedProfiles(limit);
}

export async function searchProfiles(filters: ProfileFilters) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.public);
  const offset = (filters.sayfa - 1) * PAGE_SIZE;
  return getRepository().searchPublicProfiles(filters, { limit: PAGE_SIZE, offset });
}

export async function getPublicProfile(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.public);
  return getRepository().getPublicProfile(slug);
}

export async function getLocationCounts() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.public);
  return getRepository().countPublishedByLocation();
}

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
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.public);
  const counts = await getLocationCounts();
  const { getProvince, listDistricts } = await import("@/domain/locations");
  const province = getProvince(il);
  const total = province ? profileCountFor(counts, province.plate, ilce ?? null) : 0;
  return { total, districts: province ? listDistricts(province.plate).map((d) => ({ slug: d.slug, name: d.name, count: profileCountFor(counts, province.plate, d.slug) })).filter((d) => d.count > 0) : [] };

}

/** Bounded keyset read; no offset drift during progressive discovery. */
export async function discoverProfiles(filters: ProfileFilters, cursor?: import("@/domain/discovery-cursor").DiscoveryCursor) {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.public);
  const { encodeCursor } = await import("@/domain/discovery-cursor");
  const result = await getRepository().searchPublicProfiles({ ...filters, ilgi: [], sayfa: 1 }, { limit: PAGE_SIZE + 1, offset: 0, cursor });
  const items = result.items.slice(0, PAGE_SIZE);
  const last = items.at(-1);
  return { items, total: result.total, nextCursor: result.items.length > PAGE_SIZE && last ? encodeCursor({ publishedAt: last.publishedAt, id: last.id }) : null };
}
