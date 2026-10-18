import { describe, expect, it } from "vitest";
import { deobfuscate, hasBlockingFindings, normalizeForPolicy, requiresEscalation, scanText } from "@/domain/content-policy";

const rules = (t: string) => scanText(t).map((f) => f.rule);
const blocks = (t: string) => hasBlockingFindings(scanText(t));

describe("içerik politikası: normalizasyon ve gizleme çözme", () => {
  it("aksan, ß, Türkçe karakter ve Kiril/Yunan benzer harfleri katlar", () => {
    expect(normalizeForPolicy("Erotische Maßage — Schülerin")).toBe("erotische massage schulerin");
    expect(normalizeForPolicy("Çağrı İçin")).toBe("cagri icin");
    expect(normalizeForPolicy("еsсоrt")).toBe("escort"); // Kiril е, с, о
  });
  it("görünmez karakter, l33t ve harf aralığı gizlemesini çözer", () => {
    expect(deobfuscate("es​cort")).toBe("escort");
    expect(deobfuscate("3sc0rt")).toBe("escort");
    expect(deobfuscate("e s c o r t service")).toBe("escort service");
    expect(deobfuscate("e.s.c.o.r.t")).toBe("escort");
  });
});

// [dil, metin, beklenen kural]
const PROHIBITED: [string, string, string][] = [
  ["tr", "Escort hizmeti veriyorum", "paid_sexual_services"],
  ["tr", "Saatlik ve gecelik görüşme", "paid_sexual_services"],
  ["tr", "Ücret 2000 TL", "pricing"],
  ["tr", "0532 123 45 67 arayın", "contact_phone"],
  ["tr", "Liseliyim 16 yaşındayım", "minor_reference"],
  ["tr", "Her hafta yeni kızlar", "trafficking_indicator"],
  ["en", "Discreet escort, incall and outcall available", "paid_sexual_services"],
  ["en", "Full service GFE, hotel visits", "paid_sexual_services"],
  ["en", "Prices: 150 EUR per hour", "pricing"],
  ["en", "Rates €200", "pricing"],
  ["en", "Call +44 7700 900123 anytime", "contact_phone"],
  ["en", "Add me on telegram", "contact_messaging"],
  ["en", "Barely legal schoolgirl", "minor_reference"],
  ["en", "I am 16 years old", "minor_reference"],
  ["en", "New girls every week, no passport needed", "trafficking_indicator"],
  ["en", "3sc0rt s3rvice", "paid_sexual_services"],
  ["en", "e s c o r t", "paid_sexual_services"],
  ["en", "еscоrt", "paid_sexual_services"],
  ["en", "es​cort", "paid_sexual_services"],
  ["nl", "Betaalde seks, thuisontvangst en hotelbezoek", "paid_sexual_services"],
  ["nl", "Erotische massage met happy end", "paid_sexual_services"],
  ["nl", "Mijn uurtarief is 120 euro", "pricing"],
  ["nl", "Bel 06-12345678", "contact_phone"],
  ["nl", "+31 6 1234 5678", "contact_phone"],
  ["nl", "Ik ben 16 jaar oud", "minor_reference"],
  ["nl", "Nieuwe meiden elke week", "trafficking_indicator"],
  ["de", "Begleitservice mit Haus- und Hotelbesuche", "paid_sexual_services"],
  ["de", "Sex gegen Taschengeld", "paid_sexual_services"],
  ["de", "Erotische Massage in meiner Terminwohnung", "paid_sexual_services"],
  ["de", "Stundensatz 150 €", "pricing"],
  ["de", "Ruf an: 0151 23456789", "contact_phone"],
  ["de", "+49 170 1234567", "contact_phone"],
  ["de", "Schülerin, 17 Jahre alt", "minor_reference"],
  ["de", "Täglich neue Mädchen", "trafficking_indicator"],
  ["de", "Bеgleitservice", "paid_sexual_services"], // Kiril е
];

describe("içerik politikası: yasaklı örnekler engellenir", () => {
  it.each(PROHIBITED)("[%s] “%s” → %s", (_lang, text, rule) => {
    expect(rules(text)).toContain(rule);
    expect(blocks(text)).toBe(true);
  });

  it("reşit olmayan ve istismar göstergeleri insan incelemesine yükseltilir", () => {
    expect(requiresEscalation(scanText("Barely legal schoolgirl"))).toBe(true);
    expect(requiresEscalation(scanText("Täglich neue Mädchen"))).toBe(true);
    expect(requiresEscalation(scanText("Prices: 150 EUR per hour"))).toBe(false);
  });
});

// Yasal, sosyal içerikli biyografiler: hiçbir engelleyici bulgu üretmemeli.
const PERMITTED: [string, string][] = [
  ["tr", "Hafta sonları Moda sahilinde yürüyüş yapmayı, kitap kulübüne gitmeyi ve yeni kafeler keşfetmeyi seviyorum."],
  ["tr", "Yoga eğitmeniyim; 12 yıldır sabah pratiği yapıyorum."],
  ["en", "I love hiking, board games and trying new coffee places on weekends."],
  ["en", "Physiotherapist by day; I enjoy a good sports massage after a long run."],
  ["en", "Minor details aside, I am a big fan of jazz and old movies."],
  ["en", "I have 16 years of experience as a teacher and I love chess."],
  ["nl", "Ik wandel graag langs de grachten en speel op zondag schaak in het café."],
  ["nl", "Ik werk al 16 jaar als verpleegkundige en hou van fietsen."],
  ["de", "Ich gehe gern wandern, koche italienisch und besuche Ausstellungen."],
  ["de", "Seit 15 Jahren im Chor, außerdem Massage-Ausbildung als Physiotherapeutin."],
];

describe("içerik politikası: izinli örnekler engellenmez", () => {
  it.each(PERMITTED)("[%s] “%s”", (_lang, text) => {
    expect(scanText(text).filter((f) => f.severity === "block")).toEqual([]);
  });
  it("belirsiz ifadeler yalnızca incelemeye işaretlenir", () => {
    const f = scanText("Minor details aside, I am a big fan of jazz.");
    expect(f.map((x) => x.rule)).toEqual(["minor_ambiguous"]);
    expect(hasBlockingFindings(f)).toBe(false);
  });
  it("spam sinyali yalnızca incelemedir", () => {
    const f = scanText("HELLOOOOOOOO everyone come and see");
    expect(f.map((x) => x.rule)).toContain("spam");
    expect(hasBlockingFindings(f)).toBe(false);
  });
});
