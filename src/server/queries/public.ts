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
  const { items, total } = await getRepository().searchPublicProfiles(
    { il, ilce, ilgi: [], dogrulanmis: false, sayfa: 1 },
    { limit: 500, offset: 0 },
  );
  const interestCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of items) {
    for (const i of p.interests) {
      const cur = interestCounts.get(i.slug) ?? { ...i, count: 0 };
      cur.count += 1;
      interestCounts.set(i.slug, cur);
    }
  }
  const districtCounts = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of items) {
    if (!p.district) continue;
    const cur = districtCounts.get(p.district.slug) ?? { ...p.district, count: 0 };
    cur.count += 1;
    districtCounts.set(p.district.slug, cur);
  }
  const ages = items.map((p) => p.age).sort((a, b) => a - b);
  return {
    total,
    verified: items.filter((p) => p.verified).length,
    topInterests: [...interestCounts.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    districts: [...districtCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr")),
    ageRange: ages.length ? { min: ages[0], max: ages[ages.length - 1] } : null,
  };
}
