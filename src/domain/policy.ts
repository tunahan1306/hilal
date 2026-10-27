// Modül G — genelleştirilmiş ülke×özellik politika motoru. Kaynak:
// country_feature_policies + country_feature_decisions (20261027000002 migration).
// country-policy.ts (tek-özellikli, mevcut keşif ürünü için) BURADAN AYRI ve DOKUNULMAMIŞ kalır;
// bu modül yalnızca yeni modüllerin (B/C/F) özelliklerini yönetir.
//
// Modül D için hiçbir PolicyFeature değeri yoktur — devre dışı bir özellik değil, bu kod
// tabanında hiç var olmayan bir özelliktir.
import { COUNTRY_CODES, type CountryCode } from "./countries";

export const POLICY_FEATURES = [
  "social_profiles",
  "private_messaging",
  "digital_content",
  "paid_subscriptions",
  "paid_advertising",
  "platform_payments",
] as const;
export type PolicyFeature = (typeof POLICY_FEATURES)[number];

export const POLICY_FEATURE_LABELS: Record<PolicyFeature, string> = {
  social_profiles: "Sosyal profiller",
  private_messaging: "Özel mesajlaşma",
  digital_content: "Dijital içerik",
  paid_subscriptions: "Ücretli abonelik",
  paid_advertising: "Ücretli öne çıkarma",
  platform_payments: "Platform ödemeleri",
};

export const FEATURE_POLICY_STATUSES = ["not_reviewed", "permitted", "prohibited"] as const;
export type FeaturePolicyStatus = (typeof FEATURE_POLICY_STATUSES)[number];

export type CountryFeaturePolicy = {
  countryCode: CountryCode;
  feature: PolicyFeature;
  status: FeaturePolicyStatus;
  /** permitted kararlarında zorunlu; tarih geçince özellik kendiliğinden kapanır (YYYY-MM-DD). */
  reviewDue: string | null;
  decisionId: string | null;
};

export type CountryFeatureDecision = {
  id: string;
  countryCode: CountryCode;
  feature: PolicyFeature;
  status: FeaturePolicyStatus;
  approverName: string;
  evidenceRef: string | null;
  reviewDue: string | null;
  restrictions: string | null;
  note: string | null;
  decidedBy: string;
  decidedAt: string;
};

export type NewCountryFeatureDecision = Omit<CountryFeatureDecision, "id" | "decidedAt">;

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Politikası bilinmeyen ülke×özellik çifti kapalı sayılır (varsayılan: not_reviewed, fail-closed). */
export function isFeaturePermitted(policy: CountryFeaturePolicy | undefined, now = new Date()): boolean {
  return Boolean(policy && policy.status === "permitted" && policy.reviewDue && policy.reviewDue >= today(now));
}

export function defaultFeaturePolicies(): CountryFeaturePolicy[] {
  return COUNTRY_CODES.flatMap((countryCode) =>
    POLICY_FEATURES.map((feature) => ({ countryCode, feature, status: "not_reviewed" as const, reviewDue: null, decisionId: null })),
  );
}

/** Kararın kendisi geçerli mi? (veritabanındaki permitted_requires_evidence kısıtının uygulama karşılığı) */
export function featureDecisionProblems(
  d: Pick<NewCountryFeatureDecision, "status" | "approverName" | "evidenceRef" | "reviewDue">,
  now = new Date(),
): string[] {
  const out: string[] = [];
  if (d.approverName.trim().length < 2) out.push("Sorumlu kişinin adı gerekli");
  if (d.status === "permitted") {
    if (!d.evidenceRef || d.evidenceRef.trim().length < 3) out.push("İzin kararı için kanıt / belge referansı gerekli");
    if (!d.reviewDue) out.push("İzin kararı için bir sonraki gözden geçirme tarihi gerekli");
    else if (d.reviewDue < today(now)) out.push("Gözden geçirme tarihi geçmişte olamaz");
  }
  return out;
}

/**
 * PolicyGate — her modülün "burada izinli mi?" sorusu için tek sorulacağı port.
 * Uygulamaları: server/services/policy/gate.ts (Supabase/memory repository üzerinden).
 */
export interface PolicyGate {
  isPermitted(countryCode: CountryCode, feature: PolicyFeature): Promise<boolean>;
  isPermittedBatch(countryCode: CountryCode, features: PolicyFeature[]): Promise<Record<PolicyFeature, boolean>>;
}
