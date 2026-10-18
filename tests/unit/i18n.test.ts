import { describe, expect, it } from "vitest";
import { LOCALES, fmt, negotiateLocale } from "@/i18n/config";
import { getMessages, missingKeys } from "@/i18n/messages";
import { tr } from "@/i18n/messages/tr";
import { ROUTES, SEGMENTS, internalPath, legacyRedirect, localizedPath, parseLocalized, switchLocale, type RouteKey } from "@/i18n/routes";
import { profileSlugFromUrl } from "@/server/services/privacy";

const sample = (route: RouteKey): unknown =>
  route === "location" ? { country: "nl", region: "noord-holland", locality: "amsterdam" } : route === "profile" ? { slug: "ornek-profil" } : undefined;
const loc = (lang: (typeof LOCALES)[number], route: RouteKey) => (localizedPath as (l: string, r: RouteKey, p?: unknown) => string)(lang, route, sample(route));

describe("yerel URL mimarisi", () => {
  it("her dilde segmentler benzersizdir", () => {
    for (const lang of LOCALES) {
      const segs = Object.values(SEGMENTS[lang]);
      expect(new Set(segs).size, lang).toBe(segs.length);
    }
  });

  it("üretilen her yerel adres aynı rotaya çözülür ve doğru iç rotaya yazılır", () => {
    for (const lang of LOCALES) for (const route of ROUTES) {
      const path = loc(lang, route);
      const parsed = parseLocalized(path);
      expect(parsed?.kind, path).toBe("route");
      if (parsed?.kind !== "route") continue;
      expect(parsed.parsed.route).toBe(route);
      expect(parsed.internal).toBe((internalPath as (l: string, r: RouteKey, p?: unknown) => string)(lang, route, sample(route)));
    }
  });

  it("örnek adresler beklenen biçimdedir", () => {
    expect(localizedPath("tr", "explore")).toBe("/tr/kesfet");
    expect(localizedPath("en", "explore")).toBe("/en/explore");
    expect(localizedPath("nl", "explore")).toBe("/nl/ontdekken");
    expect(localizedPath("de", "explore")).toBe("/de/entdecken");
    expect(localizedPath("de", "location", { country: "de", region: "bayern", locality: "landkreis-muenchen" })).toBe("/de/ort/de/bayern/landkreis-muenchen");
    expect(localizedPath("tr", "location", { country: "tr", region: "istanbul" })).toBe("/tr/konum/tr/istanbul");
  });

  it("iç segment veya başka dilin segmenti doğru yerel adrese yönlendirilir", () => {
    expect(parseLocalized("/tr/explore")).toEqual({ kind: "redirect", to: "/tr/kesfet" });
    expect(parseLocalized("/de/kesfet")).toEqual({ kind: "redirect", to: "/de/entdecken" });
    expect(parseLocalized("/nl/profile/abc")).toEqual({ kind: "redirect", to: "/nl/profiel/abc" });
    expect(parseLocalized("/en/yok-boyle-sayfa")).toEqual({ kind: "unknown", lang: "en" });
    expect(parseLocalized("/xx/kesfet")).toBeNull();
  });

  it("dil değiştirme aynı sayfayı ve konumu korur", () => {
    const parsed = parseLocalized("/tr/konum/nl/noord-holland/amsterdam");
    expect(parsed?.kind).toBe("route");
    if (parsed?.kind !== "route") return;
    expect(switchLocale(parsed.parsed, "de")).toBe("/de/ort/nl/noord-holland/amsterdam");
    expect(switchLocale(parsed.parsed, "en")).toBe("/en/location/nl/noord-holland/amsterdam");
  });

  it("eski öneksiz Türkçe adresler yeni adreslere eşlenir", () => {
    expect(legacyRedirect("/kesfet")).toBe("/tr/kesfet");
    expect(legacyRedirect("/sehir/istanbul")).toBe("/tr/konum/tr/istanbul");
    expect(legacyRedirect("/sehir/istanbul/kadikoy")).toBe("/tr/konum/tr/istanbul/kadikoy");
    expect(legacyRedirect("/profil/abc")).toBe("/tr/profil/abc");
    expect(legacyRedirect("/iletisim")).toBe("/tr/iletisim");
    expect(legacyRedirect("/yas-onayi")).toBe("/tr/yas-onayi");
    expect(legacyRedirect("/")).toBeNull();
    expect(legacyRedirect("/sehir/a/b/c")).toBeNull();
    expect(legacyRedirect("/admin")).toBeNull();
  });

  it("KVKK başvurusundaki profil bağlantısı her dilde çözülür", () => {
    for (const lang of LOCALES) expect(profileSlugFromUrl(`https://x.test${localizedPath(lang, "profile", { slug: "ece-12" })}`)).toBe("ece-12");
    expect(profileSlugFromUrl("https://x.test/profil/eski-adres")).toBe("eski-adres");
    expect(profileSlugFromUrl("https://x.test/kesfet")).toBeUndefined();
  });
});

describe("dil seçimi", () => {
  it("Accept-Language q değerine göre desteklenen dili seçer", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(negotiateLocale("fr-FR,fr;q=0.9,nl;q=0.5")).toBe("nl");
    expect(negotiateLocale("en-US;q=0.2,tr;q=0.9")).toBe("tr");
    expect(negotiateLocale("ja")).toBe("tr");
    expect(negotiateLocale(null)).toBe("tr");
  });
});

describe("sözlükler", () => {
  it("İngilizce, Hollandaca ve Almanca sözlükler eksiksizdir", () => {
    expect(missingKeys("en")).toEqual([]);
    expect(missingKeys("nl")).toEqual([]);
    expect(missingKeys("de")).toEqual([]);
  });
  it("her dil kaynakla aynı yapıya sahiptir ve yer tutucular korunur", () => {
    const placeholders = (v: string) => [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    const walk = (base: unknown, other: unknown, path: string) => {
      if (typeof base === "string") { expect(typeof other, path).toBe("string"); expect(placeholders(other as string), path).toBe(placeholders(base)); return; }
      if (Array.isArray(base)) { expect(Array.isArray(other), path).toBe(true); expect((other as unknown[]).length, path).toBe(base.length); return; }
      for (const k of Object.keys(base as object)) walk((base as Record<string, unknown>)[k], (other as Record<string, unknown>)[k], `${path}.${k}`);
    };
    for (const lang of ["en", "nl", "de"] as const) walk(tr, getMessages(lang), lang);
  });
  it("eksik anahtar güvenle İngilizceye, oradan Türkçeye düşer", () => {
    expect(getMessages("nl").nav.explore).toBe("Ontdekken");
    expect(getMessages("de").home.featuredTitle).toBe("Ausgewählte Profile");
    expect(getMessages("tr").nav.explore).toBe("Keşfet");
  });
  it("fmt yer tutucuları doldurur, bilinmeyeni olduğu gibi bırakır", () => {
    expect(fmt("{n} profil", { n: 3 })).toBe("3 profil");
    expect(fmt("{a} {b}", { a: "x" })).toBe("x {b}");
  });
});
