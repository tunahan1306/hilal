/**
 * Programatik SEO kuralları. Şehir/ilçe sayfaları yalnızca gerçek ve yeterli
 * içerik olduğunda indekslenir; böylece yalnızca şehir adı değişen ince
 * "doorway" sayfaları üretilmez.
 */
export const MIN_PROFILES_FOR_INDEX = 3;

export type IndexDecisionInput = {
  profileCount: number;
  /** Admin tarafından yazılmış özgün tanıtım metni var mı */
  hasCuratedIntro: boolean;
  /** Admin override: true = indexle, false = noindex, null = otomatik */
  override: boolean | null;
  /** Filtrelenmiş / sayfalanmış varyant mı (bunlar hiç indexlenmez) */
  isFilteredVariant?: boolean;
};

export function shouldIndexListing(input: IndexDecisionInput): boolean {
  if (input.isFilteredVariant) return false;
  if (input.override !== null) return input.override;
  if (input.profileCount === 0) return false;
  return input.profileCount >= MIN_PROFILES_FOR_INDEX || (input.hasCuratedIntro && input.profileCount > 0);
}

export function absoluteUrl(path: string, base: string): string {
  return new URL(path, base).toString();
}

export function truncate(text: string, max = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** JSON-LD'yi <script> içine güvenle gömmek için `<` karakterini kaçırır. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
