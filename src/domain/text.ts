const TR_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  â: "a", î: "i", û: "u", Â: "a", Î: "i", Û: "u",
};

/** Türkçe karakterleri ASCII karşılıklarına çevirip URL-güvenli slug üretir. */
export function slugifyTr(input: string): string {
  return input
    .replace(/[çğıöşüÇĞİIÖŞÜâîûÂÎÛ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Arama karşılaştırması için Türkçe duyarlı normalizasyon. */
export function normalizeTr(input: string): string {
  return slugifyTr(input).replace(/-/g, " ");
}

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export const trCollator = new Intl.Collator("tr", { sensitivity: "base" });
