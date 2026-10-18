import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { legacyRedirect, parseLocalized } from "@/i18n/routes";

/** A visitor declaration is never identity or documentary age verification. */
export const AGE_COOKIE = "hilal_adult";
export const AGE_COOKIE_VALUE = "declared-v1";
export const AGE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Yaş onayından sonra dönülecek adres. Yalnızca site içi, tanınmış yerel rotalar kabul
 * edilir (açık yönlendirme yok); eski Türkçe adresler yeni karşılığına çevrilir.
 */
export function safeReturnPath(value: unknown, lang: Locale = DEFAULT_LOCALE): string {
  const home = `/${lang}`;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return home;
  const [path, query] = value.split("?", 2);
  const parsed = parseLocalized(path);
  if (parsed?.kind === "route") return value;
  const legacy = path === "/" ? null : legacyRedirect(path);
  if (legacy) return query ? `${legacy}?${query}` : legacy;
  return home;
}
