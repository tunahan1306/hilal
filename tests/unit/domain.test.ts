import { describe, expect, it } from "vitest";
import { ageOn, isAdult } from "@/domain/age";
import { hasBlockingFindings, scanText } from "@/domain/content-policy";
import { hasActiveFilters, parseFilters, serializeFilters } from "@/domain/filters";
import { districtCount, getDistrict, getProvince, listDistricts, listProvinces } from "@/domain/locations";
import { profileInputSchema, reportInputSchema } from "@/domain/schemas";
import { safeJsonLd, shouldIndexListing, truncate } from "@/domain/seo";
import { slugifyTr } from "@/domain/text";

describe("slugifyTr", () => {
  it("Türkçe karakterleri doğru dönüştürür", () => {
    expect(slugifyTr("İstanbul")).toBe("istanbul");
    expect(slugifyTr("Kadıköy")).toBe("kadikoy");
    expect(slugifyTr("Şanlıurfa")).toBe("sanliurfa");
    expect(slugifyTr("Çağrı ÖĞÜŞ")).toBe("cagri-ogus");
    expect(slugifyTr("  Afyonkarahisar / Merkez  ")).toBe("afyonkarahisar-merkez");
    expect(slugifyTr("IĞDIR")).toBe("igdir");
  });
});

describe("konum verisi", () => {
  it("81 il ve 973 ilçe içerir", () => {
    expect(listProvinces()).toHaveLength(81);
    expect(districtCount()).toBe(973);
  });
  it("il slug'ları benzersizdir ve plakalar 1-81 arasıdır", () => {
    const provinces = listProvinces();
    expect(new Set(provinces.map((p) => p.slug)).size).toBe(81);
    expect(provinces.map((p) => p.plate).sort((a, b) => a - b)).toEqual(Array.from({ length: 81 }, (_, i) => i + 1));
  });
  it("örnek ilçeleri çözer", () => {
    expect(getProvince("istanbul")?.plate).toBe(34);
    expect(getDistrict("istanbul", "kadikoy")?.name).toBe("Kadıköy");
    expect(getDistrict("ankara", "cankaya")?.name).toBe("Çankaya");
    expect(getDistrict("izmir", "kadikoy")).toBeUndefined();
    expect(listDistricts(34)).toHaveLength(39);
  });
});

describe("yaş", () => {
  const on = new Date("2026-10-16T12:00:00Z");
  it("doğum günü öncesi ve sonrası doğru hesaplanır", () => {
    expect(ageOn("2008-10-16", on)).toBe(18);
    expect(ageOn("2008-10-17", on)).toBe(17);
    expect(isAdult("2008-10-17", on)).toBe(false);
    expect(isAdult("2008-10-16", on)).toBe(true);
    expect(isAdult("bozuk", on)).toBe(false);
  });
});

describe("içerik politikası", () => {
  it.each([
    ["Escort hizmeti veriyorum", "paid_sexual_services"],
    ["Saatlik ve gecelik görüşme", "paid_sexual_services"],
    ["Ücret 2000 TL", "pricing"],
    ["Fiyat için yazın", "pricing"],
    ["0532 123 45 67 arayın", "contact_phone"],
    ["+90 (532) 123-45-67", "contact_phone"],
    ["whatsapp'tan ulaşın", "contact_messaging"],
    ["mail: deneme@ornek.com", "contact_email"],
    ["deneme (at) ornek nokta com", "contact_email"],
    ["www.ornek.com adresime bakın", "contact_url"],
    ["Liseliyim 16 yaşındayım", "minor_reference"],
  ])("“%s” engellenir (%s)", (text, rule) => {
    const findings = scanText(text);
    expect(findings.map((f) => f.rule)).toContain(rule);
    expect(hasBlockingFindings(findings)).toBe(true);
  });

  it("normal sosyal biyografiyi engellemez", () => {
    const bio = "Hafta sonları Moda sahilinde yürüyüş yapmayı, kitap kulübüne gitmeyi ve yeni kafeler keşfetmeyi seviyorum.";
    expect(scanText(bio)).toEqual([]);
  });

  it("sosyal medya kullanıcı adını yalnızca incelemeye işaretler", () => {
    const findings = scanText("instagram hesabım var");
    expect(findings[0]?.severity).toBe("review");
    expect(hasBlockingFindings(findings)).toBe(false);
  });
});

describe("filtreler", () => {
  it("URL parametrelerini güvenli ayrıştırır", () => {
    const f = parseFilters({ il: "istanbul", ilce: "kadikoy", yasMin: "40", yasMax: "25", ilgi: "kitap-kulubu,<script>,yoga", dogrulanmis: "1", sayfa: "-3" });
    expect(f).toEqual({ il: "istanbul", ilce: "kadikoy", yasMin: 25, yasMax: 40, ilgi: ["kitap-kulubu", "yoga"], dogrulanmis: true, sayfa: 1 });
  });
  it("yaşı 18 altına indirmez", () => {
    expect(parseFilters({ yasMin: "12" }).yasMin).toBe(18);
  });
  it("il olmadan ilçe yok sayılır", () => {
    expect(parseFilters({ ilce: "kadikoy" }).ilce).toBeUndefined();
  });
  it("serileştirme kararlı ve geri dönüşümlüdür", () => {
    const f = parseFilters({ il: "ankara", ilgi: "yoga", sayfa: "2" });
    const qs = serializeFilters(f);
    expect(qs).toBe("?il=ankara&ilgi=yoga&sayfa=2");
    expect(parseFilters(Object.fromEntries(new URLSearchParams(qs)))).toEqual(f);
    expect(serializeFilters(f, ["il"])).toBe("?ilgi=yoga&sayfa=2");
    expect(hasActiveFilters(parseFilters({}))).toBe(false);
  });
});

describe("SEO kuralları", () => {
  it("boş sayfaları indekslemez", () => {
    expect(shouldIndexListing({ profileCount: 0, hasCuratedIntro: true, override: null })).toBe(false);
  });
  it("yetersiz içerikli sayfayı yalnızca özgün metin varsa indeksler", () => {
    expect(shouldIndexListing({ profileCount: 2, hasCuratedIntro: false, override: null })).toBe(false);
    expect(shouldIndexListing({ profileCount: 2, hasCuratedIntro: true, override: null })).toBe(true);
    expect(shouldIndexListing({ profileCount: 3, hasCuratedIntro: false, override: null })).toBe(true);
  });
  it("filtreli varyantlar asla indekslenmez; admin override uygulanır", () => {
    expect(shouldIndexListing({ profileCount: 50, hasCuratedIntro: true, override: true, isFilteredVariant: true })).toBe(false);
    expect(shouldIndexListing({ profileCount: 50, hasCuratedIntro: true, override: false })).toBe(false);
    expect(shouldIndexListing({ profileCount: 0, hasCuratedIntro: false, override: true })).toBe(true);
  });
  it("JSON-LD içinde script kaçışını engeller", () => {
    expect(safeJsonLd({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
  it("açıklamayı kelime sınırında keser", () => {
    expect(truncate("a ".repeat(200), 50).length).toBeLessThanOrEqual(50);
  });
});

describe("şemalar", () => {
  const valid = { nickname: "Deniz", birthDate: "1995-01-01", provincePlate: "34", districtSlug: "kadikoy", bio: "Kitap kulübü ve sahil yürüyüşlerini seven biriyim.", interestIds: [] };
  it("geçerli profili kabul eder", () => {
    expect(profileInputSchema.safeParse(valid).success).toBe(true);
  });
  it("18 yaş altını ve HTML içeriğini reddeder", () => {
    const young = new Date();
    young.setFullYear(young.getFullYear() - 17);
    expect(profileInputSchema.safeParse({ ...valid, birthDate: young.toISOString().slice(0, 10) }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...valid, bio: "<img src=x onerror=alert(1)> uzun bir metin burada" }).success).toBe(false);
  });
  it("şikâyette bot tuzağını ve geçersiz kategoriyi reddeder", () => {
    expect(reportInputSchema.safeParse({ profileId: "x", category: "hack", description: "yeterince uzun açıklama" }).success).toBe(false);
    expect(reportInputSchema.safeParse({ profileId: "x", category: "other", description: "yeterince uzun açıklama", website: "spam" }).success).toBe(false);
  });
});
