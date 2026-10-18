/**
 * İçerik politikası denetimi (Türkçe, İngilizce, Hollandaca, Almanca).
 *
 * Platform ücretli cinsel hizmet tanıtımı, fuhşa aracılık veya müşteri yönlendirme
 * amacıyla kullanılamaz. Bu modül profil metinlerinde bu amaca işaret eden kalıpları,
 * kişisel iletişim bilgilerini, reşit olmayan kişiye ve istismara işaret edebilecek
 * ifadeleri tespit eder.
 *
 * - "block": yayın ve moderasyon onayı engellenir (metin düzeltilmeli).
 * - "review": yayını tek başına engellemez; moderatörün dikkatine sunulur.
 * - `escalate`: reşit olmayan / istismar göstergeleri; bulgu insan incelemesine yükseltilir.
 *
 * Bulgu "platform kuralına aykırı" anlamına gelir, bir hukuki nitelendirme değildir. Tek
 * başına yasal olabilen sözcükler (ör. "masaj", "minor") yalnızca incelemeye işaretlenir.
 * Anahtar kelime eşleştirmesi insan moderasyonunun yerini tutmaz, onu destekler.
 */

export type PolicySeverity = "block" | "review";
export type PolicyLang = "tr" | "en" | "nl" | "de" | "any";
export type PolicyFinding = {
  rule: string;
  severity: PolicySeverity;
  message: string;
  match: string;
  lang: PolicyLang;
  /** İnsan incelemesine yükseltilmeli (reşit olmayan / istismar göstergesi). */
  escalate?: boolean;
};

type Rule = {
  id: string;
  severity: PolicySeverity;
  message: string;
  lang: PolicyLang;
  pattern: RegExp;
  /** Gizleme çözülmüş metinde de aranır (l33t, harf aralarına boşluk/nokta). Yalnızca harf kuralları. */
  deobfuscate?: boolean;
  escalate?: boolean;
  /** Yalnızca ham metinde (noktalama korunarak) aranır. */
  rawOnly?: boolean;
};

// ---------------------------------------------------------------------------
// Normalizasyon
// ---------------------------------------------------------------------------

const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁤⁪-⁯︀-️﻿]/g;

// Latin harflere benzeyen Kiril / Yunan karakterleri (ör. "еscоrt" içinde Kiril е ve о).
const HOMOGLYPHS: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", ѕ: "s", і: "i", ї: "i", ј: "j", ԁ: "d", ԛ: "q", ԝ: "w", ɡ: "g",
  α: "a", β: "b", ε: "e", η: "n", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x",
};
const SPECIAL: Record<string, string> = { ß: "ss", ı: "i", İ: "i", ø: "o", Ø: "o", æ: "ae", Æ: "ae", œ: "oe", Œ: "oe", ł: "l", Ł: "l", đ: "d", Đ: "d", þ: "th" };
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i", "|": "i", "€": "e" };

function baseFold(input: string): string {
  return input
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(/[^\u0000-\u007F]/g, (ch) => HOMOGLYPHS[ch] ?? HOMOGLYPHS[ch.toLowerCase()] ?? SPECIAL[ch] ?? ch)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/** Küçük harf, aksansız, homoglifsiz; harf/rakam dışı her şey boşluk. Rakamlar korunur. */
export function normalizeForPolicy(input: string): string {
  return baseFold(input).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Gizleme çözülmüş biçim: l33t → harf, "e s c o r t" / "e.s.c.o.r.t" → "escort". */
export function deobfuscate(input: string): string {
  const leet = baseFold(input).replace(/[0-9@$!|€]/g, (ch) => LEET[ch] ?? ch);
  const spaced = leet.replace(/[^a-z]+/g, " ").trim();
  // Tek harflik ardışık parçaları birleştir (en az 3 harf).
  return spaced.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, (run) => run.replace(/ /g, "")).replace(/\s+/g, " ");
}

function rawFold(input: string): string {
  return input.normalize("NFKC").replace(INVISIBLE, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Kurallar (normalize edilmiş metin üzerinde; ASCII, küçük harf, tek boşluk)
// ---------------------------------------------------------------------------

const PAID = "Ücretli cinsel hizmet çağrışımı yapan ifade (platform kuralına aykırı)";
const MINOR = "Reşit olmayan kişiye işaret edebilecek ifade — insan incelemesi gerekli";
const TRAFFICKING = "İstismar / insan ticareti göstergesi olabilecek ifade — insan incelemesi gerekli";

const RULES: Rule[] = [
  // — Ücretli cinsel hizmet —
  {
    id: "paid_sexual_services", severity: "block", message: PAID, lang: "tr", deobfuscate: true,
    pattern: /\b(eskort|escort|refakatci|vip bayan|vip partner|ucretli (gorusme|bulusma|beraberlik)|para karsiligi|happy end|mutlu son|full hizmet|sinirsiz hizmet|elden odeme|gecelik|saatlik|seans ucreti|ozel hizmet|otele gelir|eve gelir|evine gelir|yere gelir|kendi yeri var|apart|rezidans ve otel)\b/,
  },
  {
    id: "paid_sexual_services", severity: "block", message: PAID, lang: "en", deobfuscate: true,
    pattern: /\b(escorts?|escorting|call ?girls?|happy ending|full service|gfe|pse|girlfriend experience|porn ?star experience|incalls?|outcalls?|in call|out call|hotel (visits?|calls?)|home visits?|paid (dates?|dating|meetings?|companionship|company)|sex for (money|cash|gifts?)|pay(ing)? for sex|erotic massages?|sensual massages?|nuru|body ?to ?body massage|no rush service|donations? (only|required))\b/,
  },
  {
    id: "paid_sexual_services", severity: "block", message: PAID, lang: "nl", deobfuscate: true,
    pattern: /\b(escort(service|bureau|dame)?s?|betaalde (seks|sex|afspraak|afspraken|date)|seks tegen betaling|sex tegen betaling|erotische massages?|thuisontvangst|prive ?ontvangst|hotelbezoek(en)?|huisbezoek(en)?|privehuis|raamprostitutie|happy end)\b/,
  },
  {
    id: "paid_sexual_services", severity: "block", message: PAID, lang: "de", deobfuscate: true,
    pattern: /\b(escort(service|agentur|dame)?s?|begleitservice|begleitagentur|haus ?(und )?hotelbesuche|hausbesuche|hotelbesuche|erotische massagen?|terminwohnung|modelwohnung|laufhaus|sex gegen (geld|bezahlung|taschengeld)|taschengeld|bezahlte (treffen|dates?|liebe)|happy end|zartlichkeiten gegen)\b/,
  },

  // — Fiyat / ücret —
  {
    id: "pricing", severity: "block", message: "Fiyat / ücret bilgisi", lang: "any", rawOnly: true,
    pattern: /(\b\d[\d.,]*\s*(tl|try|lira|usd|dolar|euro|euros|eur|chf|gbp)\b|[₺$€£]\s*\d|\d\s*[₺$€£])/,
  },
  { id: "pricing", severity: "block", message: "Fiyat / ücret bilgisi", lang: "tr", pattern: /\b(fiyat|ucret|tarife|paket fiyat)/ },
  { id: "pricing", severity: "block", message: "Fiyat / ücret bilgisi", lang: "en", pattern: /\b(price ?list|prices|pricing|per hour|per night|hourly rate|an hour rate|\d+ ?(hr|hrs|h) ?rate)\b/ },
  { id: "pricing", severity: "block", message: "Fiyat / ücret bilgisi", lang: "nl", pattern: /\b(prijs|prijzen|prijslijst|tarief|tarieven|uurtarief|per uur|per nacht)\b/ },
  { id: "pricing", severity: "block", message: "Fiyat / ücret bilgisi", lang: "de", pattern: /\b(preis|preise|preisliste|stundensatz|pro stunde|pro nacht|honorar)\b/ },

  // — Kişisel iletişim bilgisi —
  { id: "contact_phone", severity: "block", message: "Telefon numarası", lang: "tr", rawOnly: true, pattern: /(\+?90[\s-]?)?\(?0?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/ },
  { id: "contact_phone", severity: "block", message: "Telefon numarası", lang: "nl", rawOnly: true, pattern: /(\+|00)\s?31[\s.()-]*6[\s.-]?(\d[\s.-]?){7}\d|\b06[\s.-]?(\d[\s.-]?){7}\d\b/ },
  { id: "contact_phone", severity: "block", message: "Telefon numarası", lang: "de", rawOnly: true, pattern: /(\+|00)\s?49[\s.()-]*1[5-7](\d[\s./-]?){7,9}\d|\b01[5-7]\d[\s./-]?(\d[\s./-]?){6,8}\d\b/ },
  // Uluslararası biçim veya 10+ haneli herhangi bir numara dizisi.
  { id: "contact_phone", severity: "block", message: "Telefon numarası", lang: "any", rawOnly: true, pattern: /(\+|\b00)\s?[1-9]\d{0,2}[\s.()-]*(\d[\s.()/-]?){7,12}\d|\b(\d[\s.()/-]?){10,13}\d\b/ },
  {
    id: "contact_messaging", severity: "block", message: "Mesajlaşma uygulaması / harici iletişim yönlendirmesi", lang: "any", deobfuscate: true,
    pattern: /\b(whatsapp|whats app|watsapp|wapp|wp den|wpden|telegram|tg den|signal app|threema|snapchat|onlyfans|fansly|wechat|kik)\b/,
  },
  {
    id: "contact_redirect", severity: "review", message: "Harici iletişime yönlendirme olabilir", lang: "any",
    pattern: /\b(dm me|text me|message me privately|app me|stuur (een |me een )?appje|app mij|schreib mir privat|bana yaz(in)? ozelden|ozelden yaz)\b/,
  },
  { id: "contact_email", severity: "block", message: "E-posta adresi", lang: "any", rawOnly: true, pattern: /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\{at\})\s*[a-z0-9.-]+\s*(\.|\(dot\)|\[dot\]|nokta|punt|punkt)\s*[a-z]{2,}/ },
  { id: "contact_url", severity: "block", message: "Harici bağlantı", lang: "any", rawOnly: true, pattern: /\b(https?|www)\b|\b[a-z0-9-]+\s?\.\s?(com|net|org|me|io|co|link|ly|tr|nl|de|eu|info|xyz)\b/ },
  { id: "social_handle", severity: "review", message: "Sosyal medya kullanıcı adı olabilir", lang: "any", rawOnly: true, pattern: /(^|\s)@[a-z0-9_.]{3,}|\b(instagram|insta|ig|tiktok|twitter|x com)\b/ },

  // — Reşit olmayan kişiye işaret —
  { id: "minor_reference", severity: "block", message: MINOR, lang: "tr", escalate: true, pattern: /\b(liseli|lise ogrencisi|ortaokul|1[0-7] yas(inda|indayim)?|kucuk kiz|kucuk erkek|underage|teen)\b/ },
  { id: "minor_reference", severity: "block", message: MINOR, lang: "en", escalate: true, deobfuscate: true, pattern: /\b(under ?age|underaged|barely legal|school ?girls?|school ?boys?|teens?|1[0-7] ?(yo|y o|years? old|yrs? old)|i ?a?m 1[0-7]|jailbait|lolita)\b/ },
  { id: "minor_reference", severity: "block", message: MINOR, lang: "nl", escalate: true, deobfuscate: true, pattern: /\b(minderjarige?|scholiere|schoolmeisjes?|1[0-7] jaar oud|ik ben 1[0-7])\b/ },
  { id: "minor_reference", severity: "block", message: MINOR, lang: "de", escalate: true, deobfuscate: true, pattern: /\b(minderjahrige?|schulerin|schulmadchen|1[0-7] jahre alt|ich bin 1[0-7]|noch nicht volljahrig)\b/ },
  // "minor" tek başına ("minor details") yasal olabilir: yalnızca inceleme.
  { id: "minor_ambiguous", severity: "review", message: "Yaşa ilişkin belirsiz ifade", lang: "en", pattern: /\b(minor|young girls?|young boys?)\b/ },

  // — İstismar / insan ticareti göstergeleri —
  {
    id: "trafficking_indicator", severity: "block", message: TRAFFICKING, lang: "any", escalate: true, deobfuscate: true,
    pattern: /\b(her hafta yeni kizlar|yeni kizlar geldi|taze kizlar|new girls? (every|each) (day|week)|fresh girls|new girls arrived|no passport|passport (taken|kept)|debt to (pay|work off)|nieuwe (meiden|meisjes|dames) (elke|iedere) (dag|week)|verse meiden|taglich neue (madchen|girls|frauen)|wochentlich neue (madchen|girls|frauen)|neue madchen eingetroffen|frische madchen)\b/,
  },
  // Birden çok kişinin tek profilden sunulması.
  { id: "multiple_persons", severity: "review", message: "Birden fazla kişinin tek profilden sunulması olabilir", lang: "any", pattern: /\b(\d+ (kiz|kizlar|girls|meiden|dames|madchen|damen)|we are \d+ girls|meerdere dames|mehrere (damen|madchen)|birden fazla bayan)\b/ },

  // — Müstehcenlik (yalnızca inceleme) —
  { id: "explicit", severity: "review", message: "Müstehcen içerik olabilir", lang: "tr", pattern: /\b(seks|sex|ciplak|erotik|fetis|swinger|one night|tek gecelik)\b/ },
  { id: "explicit", severity: "review", message: "Müstehcen içerik olabilir", lang: "en", deobfuscate: true, pattern: /\b(sexy|nude|nudes|naked|erotic|fetish|bdsm|kinky|porn|horny|one night stand)\b/ },
  { id: "explicit", severity: "review", message: "Müstehcen içerik olabilir", lang: "nl", deobfuscate: true, pattern: /\b(naakt|erotisch|erotiek|geil|seksueel|neuken)\b/ },
  { id: "explicit", severity: "review", message: "Müstehcen içerik olabilir", lang: "de", deobfuscate: true, pattern: /\b(nackt|erotisch|erotik|geil|fetisch|ficken|sexuell)\b/ },
];

// Spam sinyalleri (yalnızca inceleme): tekrar eden karakter, aşırı büyük harf, aşırı emoji.
function spamFinding(input: string): PolicyFinding | null {
  const letters = input.replace(/[^\p{L}]/gu, "");
  const upper = input.replace(/[^\p{Lu}]/gu, "").length;
  const emoji = (input.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  const repeated = /(.)\1{5,}/u.exec(input);
  if (repeated) return { rule: "spam", severity: "review", message: "Spam olabilir (tekrar eden karakter)", match: repeated[0].slice(0, 12), lang: "any" };
  if (letters.length >= 30 && upper / letters.length > 0.7) return { rule: "spam", severity: "review", message: "Spam olabilir (büyük harf)", match: input.slice(0, 24), lang: "any" };
  if (emoji >= 10) return { rule: "spam", severity: "review", message: "Spam olabilir (aşırı emoji)", match: `${emoji} emoji`, lang: "any" };
  return null;
}

export function scanText(input: string): PolicyFinding[] {
  const raw = rawFold(input);
  const normalized = normalizeForPolicy(input);
  const clear = deobfuscate(input);
  const findings: PolicyFinding[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    if (seen.has(rule.id)) continue;
    const m = rule.rawOnly
      ? rule.pattern.exec(raw) ?? rule.pattern.exec(normalized)
      : rule.pattern.exec(normalized) ?? (rule.deobfuscate ? rule.pattern.exec(clear) : null) ?? rule.pattern.exec(raw);
    if (m) {
      seen.add(rule.id);
      findings.push({ rule: rule.id, severity: rule.severity, message: rule.message, match: m[0].trim(), lang: rule.lang, ...(rule.escalate ? { escalate: true } : {}) });
    }
  }
  const spam = spamFinding(input);
  if (spam) findings.push(spam);
  return findings;
}

export function scanProfileContent(fields: { nickname: string; bio: string; extra?: string[] }): PolicyFinding[] {
  const parts = [fields.nickname, fields.bio, ...(fields.extra ?? [])].join("\n");
  return scanText(parts);
}

export function hasBlockingFindings(findings: PolicyFinding[]): boolean {
  return findings.some((f) => f.severity === "block");
}

/** İnsan incelemesine yükseltilmesi gereken bulgu var mı? (reşit olmayan / istismar göstergesi) */
export function requiresEscalation(findings: PolicyFinding[]): boolean {
  return findings.some((f) => f.escalate);
}
