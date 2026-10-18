// Yerelleştirilmiş URL mimarisi. İstemci ve sunucu ortak; saf fonksiyonlar.
//
// Dış adres:   /{lang}/{yerel-segment}/...      ör. /nl/ontdekken, /de/ort/de/bayern/landkreis-muenchen
// İç rota:     /{lang}/{iç-segment}/...         ör. /nl/explore,   /de/location/de/bayern/landkreis-muenchen
// Proxy dış adresi iç rotaya yeniden yazar; yanlış dildeki veya iç segmentli adresleri 301 ile düzeltir.
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./config";

export const ROUTES = ["home", "explore", "cities", "location", "profile", "packages", "safety", "privacy", "terms", "removal", "contact", "reported", "age", "notFound"] as const;
export type RouteKey = (typeof ROUTES)[number];

/** İç (fiziksel klasör) segmentleri. `home` boş segmenttir. */
export const INTERNAL_SEGMENT: Record<Exclude<RouteKey, "home">, string> = {
  explore: "explore",
  cities: "cities",
  location: "location",
  profile: "profile",
  packages: "packages",
  safety: "safety",
  privacy: "privacy",
  terms: "terms",
  removal: "removal-request",
  contact: "contact",
  reported: "report-received",
  age: "age-check",
  notFound: "not-found-page",
};

/** Dile göre dış segmentler. Her dilde benzersiz olmalı (unit testi denetler). */
export const SEGMENTS: Record<Locale, Record<Exclude<RouteKey, "home">, string>> = {
  tr: { explore: "kesfet", cities: "sehirler", location: "konum", profile: "profil", packages: "paketler", safety: "guvenlik", privacy: "kvkk", terms: "kullanim-kosullari", removal: "kaldirma-talebi", contact: "iletisim", reported: "bildirim-alindi", age: "yas-onayi", notFound: "bulunamadi" },
  en: { explore: "explore", cities: "cities", location: "location", profile: "profile", packages: "plans", safety: "safety", privacy: "privacy", terms: "terms", removal: "removal-request", contact: "contact", reported: "report-received", age: "age-check", notFound: "not-found" },
  nl: { explore: "ontdekken", cities: "steden", location: "locatie", profile: "profiel", packages: "pakketten", safety: "veiligheid", privacy: "privacy", terms: "voorwaarden", removal: "verwijderverzoek", contact: "contact", reported: "melding-ontvangen", age: "leeftijdscheck", notFound: "niet-gevonden" },
  de: { explore: "entdecken", cities: "staedte", location: "ort", profile: "profil", packages: "pakete", safety: "sicherheit", privacy: "datenschutz", terms: "nutzungsbedingungen", removal: "entfernungsantrag", contact: "kontakt", reported: "meldung-erhalten", age: "altersbestaetigung", notFound: "nicht-gefunden" },
};

export type RouteParams = {
  location: { country: string; region?: string; locality?: string };
  profile: { slug: string };
};

type Tail<K extends RouteKey> = K extends keyof RouteParams ? [params: RouteParams[K]] : [];

function tailOf(route: RouteKey, params: unknown): string[] {
  if (route === "location") {
    const p = params as RouteParams["location"];
    return [p.country, p.region, p.locality].filter((s): s is string => Boolean(s));
  }
  if (route === "profile") return [(params as RouteParams["profile"]).slug];
  return [];
}

/** Ziyaretçiye gösterilen yerel adres (bağlantılar, canonical, hreflang, sitemap). */
export function localizedPath<K extends RouteKey>(lang: Locale, route: K, ...rest: Tail<K>): string {
  if (route === "home") return `/${lang}`;
  const parts = [lang, SEGMENTS[lang][route as Exclude<RouteKey, "home">], ...tailOf(route, rest[0])];
  return `/${parts.map(encodeURIComponent).join("/")}`;
}

/** Fiziksel rota (proxy yeniden yazma hedefi). */
export function internalPath<K extends RouteKey>(lang: Locale, route: K, ...rest: Tail<K>): string {
  if (route === "home") return `/${lang}`;
  const parts = [lang, INTERNAL_SEGMENT[route as Exclude<RouteKey, "home">], ...tailOf(route, rest[0])];
  return `/${parts.map(encodeURIComponent).join("/")}`;
}

export type ParsedPath = { lang: Locale; route: RouteKey; tail: string[] };

const bySegment = new Map<string, RouteKey>();
for (const lang of LOCALES) for (const [route, seg] of Object.entries(SEGMENTS[lang])) bySegment.set(`${lang}:${seg}`, route as RouteKey);
const byInternal = new Map(Object.entries(INTERNAL_SEGMENT).map(([route, seg]) => [seg, route as RouteKey]));

/**
 * Dış adresi çözer. Dönüş:
 * - `{ kind: "route" }`: geçerli yerel adres (yeniden yazılır)
 * - `{ kind: "redirect", to }`: iç segment veya başka dilin segmenti kullanılmış → yerel adrese 301
 * - `{ kind: "unknown" }`: dil önekli ama tanınmayan segment (404)
 * - `null`: dil öneki yok
 */
export function parseLocalized(pathname: string):
  | { kind: "route"; parsed: ParsedPath; internal: string }
  | { kind: "redirect"; to: string }
  | { kind: "unknown"; lang: Locale }
  | null {
  const parts = pathname.split("/").filter(Boolean).map((p) => safeDecode(p));
  const [first, seg, ...tail] = parts;
  if (!isLocale(first)) return null;
  const lang = first;
  if (seg === undefined) return { kind: "route", parsed: { lang, route: "home", tail: [] }, internal: `/${lang}` };
  const route = bySegment.get(`${lang}:${seg}`);
  if (route && route !== "home") {
    const internal = `/${[lang, INTERNAL_SEGMENT[route], ...tail].map(encodeURIComponent).join("/")}`;
    return { kind: "route", parsed: { lang, route, tail }, internal };
  }
  // İç segment veya başka bir dilin segmenti: doğru yerel adrese kalıcı yönlendir.
  const foreign = byInternal.get(seg) ?? LOCALES.map((l) => bySegment.get(`${l}:${seg}`)).find(Boolean);
  if (foreign && foreign !== "home") {
    return { kind: "redirect", to: `/${[lang, SEGMENTS[lang][foreign], ...tail].map(encodeURIComponent).join("/")}` };
  }
  return { kind: "unknown", lang };
}

/** Aynı sayfanın başka dildeki adresi (dil seçici, hreflang). */
export function switchLocale(parsed: ParsedPath, to: Locale): string {
  if (parsed.route === "home") return `/${to}`;
  return `/${[to, SEGMENTS[to][parsed.route], ...parsed.tail].map(encodeURIComponent).join("/")}`;
}

/** Tüm dillerdeki karşılıklar (hreflang için). */
export function alternatesFor(parsed: Omit<ParsedPath, "lang">): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, switchLocale({ ...parsed, lang: l }, l)])) as Record<Locale, string>;
}

/**
 * Dil öneki olmayan eski Türkçe adresler (2026-10 öncesi) → yeni yerel adres (301).
 * `/sehir/:il/:ilce` artık ülke kodu içerir: `/tr/konum/tr/:il/:ilce`.
 */
export function legacyRedirect(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean).map((p) => safeDecode(p));
  if (parts.length === 0) return null; // kök: dil tespiti ayrı yapılır
  const [seg, ...tail] = parts;
  if (seg === "sehir" && tail.length >= 1 && tail.length <= 2) return localizedPath(DEFAULT_LOCALE, "location", { country: "tr", region: tail[0], locality: tail[1] });
  const route = bySegment.get(`${DEFAULT_LOCALE}:${seg}`);
  if (!route || route === "home" || route === "location") return null;
  if (route === "profile") return tail.length === 1 ? localizedPath(DEFAULT_LOCALE, "profile", { slug: tail[0] }) : null;
  return tail.length === 0 ? localizedPath(DEFAULT_LOCALE, route) : null;
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}
