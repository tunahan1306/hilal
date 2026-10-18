// İstemci ve sunucu ortak: yalnızca saf sabitler ve yardımcılar.

export const LOCALES = ["tr", "en", "nl", "de"] as const;
export type Locale = (typeof LOCALES)[number];

/** Eski (öneksiz) Türkçe adreslerin ve dil tespiti başarısızsa kullanılan dil. */
export const DEFAULT_LOCALE: Locale = "tr";
/** hreflang x-default: dil seçimi yapılamayan uluslararası ziyaretçi. */
export const X_DEFAULT_LOCALE: Locale = "en";

export const INTL_LOCALE: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", nl: "nl-NL", de: "de-DE" };
export const OG_LOCALE: Record<Locale, string> = { tr: "tr_TR", en: "en_GB", nl: "nl_NL", de: "de_DE" };
export const LOCALE_NAMES: Record<Locale, string> = { tr: "Türkçe", en: "English", nl: "Nederlands", de: "Deutsch" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Accept-Language başlığından en uygun dil (q değerlerine göre). */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const prefs = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = Number(rest.find((r) => r.trim().startsWith("q="))?.trim().slice(2) ?? 1);
      return { lang: tag.toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);
  return prefs.find((p) => isLocale(p.lang))?.lang as Locale | undefined ?? DEFAULT_LOCALE;
}

export function formatDateIntl(locale: Locale, iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Istanbul", ...opts }).format(new Date(iso));
}

export function formatNumberIntl(locale: Locale, n: number) {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n);
}

/** "{name} profil" gibi yer tutucuları doldurur. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
