/**
 * İçerik politikası denetimi.
 *
 * Platform ücretli cinsel hizmet tanıtımı, fuhşa aracılık veya müşteri yönlendirme
 * amacıyla kullanılamaz. Bu modül profil metinlerinde bu amaca işaret eden
 * kalıpları ve kişisel iletişim bilgilerini tespit eder. "block" seviyesindeki bir
 * bulgu profilin yayınlanmasını engeller; "review" seviyesindeki bulgular
 * moderatörün dikkatine sunulur.
 *
 * Anahtar kelime eşleştirmesi tek başına yeterli değildir; insan moderasyonunun
 * yerini tutmaz, onu destekler.
 */
import { normalizeTr } from "./text";

export type PolicySeverity = "block" | "review";
export type PolicyFinding = {
  rule: string;
  severity: PolicySeverity;
  message: string;
  match: string;
};

type Rule = { id: string; severity: PolicySeverity; message: string; pattern: RegExp };

// Normalize edilmiş (ASCII, küçük harf, boşluklu) metin üzerinde çalışır.
const RULES: Rule[] = [
  {
    id: "paid_sexual_services",
    severity: "block",
    message: "Ücretli cinsel hizmet çağrışımı yapan ifade",
    pattern:
      /\b(eskort|escort|refakatci|vip bayan|vip partner|ucretli (gorusme|bulusma|beraberlik)|para karsiligi|happy end|mutlu son|full hizmet|sinirsiz hizmet|elden odeme|gecelik|saatlik|seans ucreti|ozel hizmet|otele gelir|eve gelir|evine gelir|yere gelir|kendi yeri var|apart|rezidans ve otel)\b/,
  },
  {
    id: "pricing",
    severity: "block",
    message: "Fiyat / ücret bilgisi",
    pattern: /(\b\d[\d.,]*\s*(tl|try|lira|usd|dolar|euro|eur)\b|[₺$€]\s*\d|\bfiyat|\bucret|\btarife|\bpaket fiyat)/,
  },
  {
    id: "contact_phone",
    severity: "block",
    message: "Telefon numarası",
    pattern: /(\+?90[\s-]?)?\(?0?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/,
  },
  {
    id: "contact_messaging",
    severity: "block",
    message: "Mesajlaşma uygulaması / harici iletişim yönlendirmesi",
    pattern: /\b(whatsapp|whats app|wp den|wpden|telegram|tg den|signal|snapchat|onlyfans|wechat|kik)\b/,
  },
  {
    id: "contact_email",
    severity: "block",
    message: "E-posta adresi",
    pattern: /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9.-]+\s*(\.|\(dot\)|nokta)\s*[a-z]{2,}/,
  },
  {
    id: "contact_url",
    severity: "block",
    message: "Harici bağlantı",
    pattern: /\b(https?|www)\b|\b[a-z0-9-]+\s?\.\s?(com|net|org|me|io|co|link|ly|tr)\b/,
  },
  {
    id: "social_handle",
    severity: "review",
    message: "Sosyal medya kullanıcı adı olabilir",
    pattern: /(^|\s)@[a-z0-9_.]{3,}|\b(instagram|insta|ig|tiktok|twitter|x com)\b/,
  },
  {
    id: "minor_reference",
    severity: "block",
    message: "Reşit olmayan kişiye işaret edebilecek ifade",
    pattern: /\b(liseli|lise ogrencisi|ortaokul|1[0-7] yas(inda|indayim)?|kucuk kiz|kucuk erkek|minor|underage|teen)\b/,
  },
  {
    id: "explicit",
    severity: "review",
    message: "Müstehcen içerik olabilir",
    pattern: /\b(seks|sex|ciplak|erotik|fetis|swinger|one night|tek gecelik)\b/,
  },
];

export function scanText(input: string): PolicyFinding[] {
  const raw = input.toLowerCase();
  const normalized = normalizeTr(input);
  const findings: PolicyFinding[] = [];
  for (const rule of RULES) {
    // E-posta / URL kalıpları noktalama içerdiği için ham metinde de aranır.
    const m = rule.pattern.exec(normalized) ?? rule.pattern.exec(raw);
    if (m) {
      findings.push({ rule: rule.id, severity: rule.severity, message: rule.message, match: m[0].trim() });
    }
  }
  return findings;
}

export function scanProfileContent(fields: { nickname: string; bio: string; extra?: string[] }): PolicyFinding[] {
  const parts = [fields.nickname, fields.bio, ...(fields.extra ?? [])].join("\n");
  return scanText(parts);
}

export function hasBlockingFindings(findings: PolicyFinding[]): boolean {
  return findings.some((f) => f.severity === "block");
}
