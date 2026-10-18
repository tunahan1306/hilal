// Sayfa metadata yardımcıları: canonical (yerel adres), hreflang alternatifleri ve Open Graph.
import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { LOCALES, OG_LOCALE, X_DEFAULT_LOCALE, type Locale } from "./config";
import { localizedPath, type RouteKey, type RouteParams } from "./routes";

type Params<K extends RouteKey> = K extends keyof RouteParams ? RouteParams[K] : undefined;

function pathFor<K extends RouteKey>(lang: Locale, route: K, params: Params<K>): string {
  return (localizedPath as (l: Locale, r: RouteKey, p?: unknown) => string)(lang, route, params);
}

/** canonical = bu dildeki adres; languages = her dilin karşılığı + x-default. */
export function i18nAlternates<K extends RouteKey>(lang: Locale, route: K, params?: Params<K>): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [l, pathFor(l, route, params as Params<K>)]));
  languages["x-default"] = pathFor(X_DEFAULT_LOCALE, route, params as Params<K>);
  return { canonical: pathFor(lang, route, params as Params<K>), languages };
}

export function i18nOpenGraph<K extends RouteKey>(lang: Locale, route: K, params: Params<K> | undefined, title: string, description?: string): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    locale: OG_LOCALE[lang],
    alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
    siteName: SITE.name,
    url: pathFor(lang, route, params as Params<K>),
    title: `${title} | ${SITE.name}`,
    description,
  };
}

/** Basit sayfalar için tek çağrıda title + description + canonical + hreflang + OG. */
export function i18nPageMeta<K extends RouteKey>(lang: Locale, route: K, params: Params<K> | undefined, title: string, description?: string, extra: Metadata = {}): Metadata {
  return { title, description, alternates: i18nAlternates(lang, route, params), openGraph: i18nOpenGraph(lang, route, params, title, description), ...extra };
}

/**
 * Yalnızca Türkçe aslı olan hukuki metinler: tüm dillerde canonical Türkçe asıl adrestir ve
 * hreflang alternatifi YOKTUR (çevirisi olmayan sayfa için dil alternatifi bildirmek, noindex ve
 * başka dile canonical ile çelişen sinyal üretir). Türkçe dışındaki kopyalar indekslenmez.
 */
export function legalPageMeta(lang: Locale, route: "privacy" | "terms", title: string, description?: string): Metadata {
  const original = localizedPath("tr", route);
  return {
    title,
    description,
    alternates: { canonical: original },
    openGraph: { type: "website", locale: OG_LOCALE.tr, siteName: SITE.name, url: original, title: `${title} | ${SITE.name}`, description },
    ...(lang === "tr" ? {} : { robots: { index: false, follow: true } }),
  };
}
