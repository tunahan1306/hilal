import "server-only";
import { updateTag } from "next/cache";

export const TAGS = {
  public: "public-profiles",
  seo: "seo-pages",
  interests: "interests",
} as const;

/**
 * Kamuya açık önbelleği hemen geçersiz kılar (read-your-own-writes). Yayından
 * kaldırma gibi işlemlerin bayat içerik sunmaması için `updateTag` kullanılır.
 * Yalnızca Server Action bağlamında çağrılabilir.
 */
export function invalidatePublic(...extra: (keyof typeof TAGS)[]): void {
  updateTag(TAGS.public);
  for (const t of extra) updateTag(TAGS[t]);
}
