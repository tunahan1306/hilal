// Ülke yayın kapısı. Veritabanındaki kaynak: countries.publication_status + review_due
// (country_publication_decisions kaydından türetilir). Bu modül saf fonksiyonlar içerir;
// aynı kural veritabanında public.country_publishable() olarak uygulanır.
import { COUNTRY_CODES, type CountryCode } from "./countries";

export const PUBLICATION_STATUSES = ["not_reviewed", "permitted", "prohibited"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  not_reviewed: "İncelenmedi",
  permitted: "Yayına izinli",
  prohibited: "Yasak",
};

export type CountryPolicy = {
  code: CountryCode;
  status: PublicationStatus;
  /** permitted kararlarında zorunlu; tarih geçince ülke kendiliğinden kapanır (YYYY-MM-DD). */
  reviewDue: string | null;
  decisionId: string | null;
};

export type CountryDecision = {
  id: string;
  countryCode: CountryCode;
  status: PublicationStatus;
  approverName: string;
  evidenceRef: string | null;
  reviewDue: string | null;
  restrictions: string | null;
  note: string | null;
  decidedBy: string;
  decidedAt: string;
};

export type NewCountryDecision = Omit<CountryDecision, "id" | "decidedAt">;

/** Takvim günü karşılaştırması (UTC); veritabanındaki current_date ile aynı anlam. */
function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function isPublishable(policy: CountryPolicy | undefined, now = new Date()): boolean {
  return Boolean(policy && policy.status === "permitted" && policy.reviewDue && policy.reviewDue >= today(now));
}

/** Politikası bilinmeyen ülke kapalı sayılır (varsayılan: not_reviewed). */
export function publishableCountries(policies: CountryPolicy[], now = new Date()): CountryCode[] {
  return COUNTRY_CODES.filter((c) => isPublishable(policies.find((p) => p.code === c), now));
}

export function defaultPolicies(): CountryPolicy[] {
  return COUNTRY_CODES.map((code) => ({ code, status: "not_reviewed", reviewDue: null, decisionId: null }));
}

/** Kararın kendisi geçerli mi? (veritabanındaki permitted_requires_evidence kısıtının uygulama karşılığı) */
export function decisionProblems(d: Pick<NewCountryDecision, "status" | "approverName" | "evidenceRef" | "reviewDue">, now = new Date()): string[] {
  const out: string[] = [];
  if (d.approverName.trim().length < 2) out.push("Sorumlu kişinin adı gerekli");
  if (d.status === "permitted") {
    if (!d.evidenceRef || d.evidenceRef.trim().length < 3) out.push("İzin kararı için kanıt / belge referansı gerekli");
    if (!d.reviewDue) out.push("İzin kararı için bir sonraki gözden geçirme tarihi gerekli");
    else if (d.reviewDue < today(now)) out.push("Gözden geçirme tarihi geçmişte olamaz");
  }
  return out;
}
