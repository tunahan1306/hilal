import "server-only";
import { z } from "zod";
import { COUNTRY_CODES, type CountryCode } from "@/domain/countries";
import {
  featureDecisionProblems,
  isFeaturePermitted,
  POLICY_FEATURES,
  FEATURE_POLICY_STATUSES,
  type CountryFeatureDecision,
  type PolicyFeature,
  type PolicyGate,
} from "@/domain/policy";
import type { Admin } from "@/domain/types";
import { getRepository } from "../repositories";
import { audit } from "./audit";
import { DomainError } from "./errors";

export const featureDecisionSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  feature: z.enum(POLICY_FEATURES),
  status: z.enum(FEATURE_POLICY_STATUSES),
  approverName: z.string().trim().min(2, "Sorumlu kişinin adı gerekli").max(120),
  evidenceRef: z.string().trim().max(500).transform((v) => v || null),
  reviewDue: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Geçerli bir tarih girin").transform((v) => v || null),
  restrictions: z.string().trim().max(1000).transform((v) => v || null),
  note: z.string().trim().max(1000).transform((v) => v || null),
  /** Hassas işlem onayı: yönetici ülke+özellik kombinasyonunu yeniden yazar. */
  confirm: z.string().trim(),
});
export type FeatureDecisionInput = z.input<typeof featureDecisionSchema>;

/**
 * Ülke×özellik politika kararı kaydeder (Modül G). country-policy.ts'teki
 * recordCountryDecision ile birebir aynı yetki modeli: yalnızca sahip rolü, karar yalnızca
 * eklenir. Veritabanında aynı kurallar RLS, kısıt ve tetikleyiciyle de uygulanır (servis
 * anahtarı RLS'i atladığı için sahip kontrolü burada zorunludur). Bu işlem hukuki onay
 * ÜRETMEZ: kaydedilen kişi ve belge referansı gerçek bir değerlendirmeye dayanmalıdır.
 */
export async function recordFeaturePolicyDecision(actor: Admin, raw: FeatureDecisionInput, now = new Date()): Promise<CountryFeatureDecision> {
  if (actor.role !== "owner") throw new DomainError("Ülke×özellik politika kararını yalnızca sahip rolündeki yönetici kaydedebilir", "forbidden");
  const input = featureDecisionSchema.parse(raw);
  if (input.confirm.toLowerCase() !== `${input.countryCode}:${input.feature}`) {
    throw new DomainError("Onay için ülke kodu ve özelliği doğru yazın (ör. de:digital_content)");
  }
  const problems = featureDecisionProblems(input, now);
  if (problems.length) throw new DomainError(problems.join("; "));
  const row = await getRepository().addCountryFeatureDecision({
    countryCode: input.countryCode,
    feature: input.feature,
    status: input.status,
    approverName: input.approverName,
    evidenceRef: input.evidenceRef,
    reviewDue: input.reviewDue,
    restrictions: input.restrictions,
    note: input.note,
    decidedBy: actor.id,
  });
  // Veritabanı tetikleyicisi ayrıca denetim kaydı yazar; bu kayıt uygulama tarafındaki iz içindir.
  await audit(actor, "country_feature.decision.recorded", "country_feature_policy", `${row.countryCode}:${row.feature}`, {
    decisionId: row.id,
    status: row.status,
  });
  return row;
}

/**
 * PolicyGate — her modülün (B/C/F) "burada izinli mi?" sorusu için ÇAĞIRDIĞI TEK yer.
 * Diğer servisler country_feature_policies'i doğrudan sorgulamaz; yalnızca bu port üzerinden.
 */
class RepositoryPolicyGate implements PolicyGate {
  async isPermitted(countryCode: CountryCode, feature: PolicyFeature): Promise<boolean> {
    const policies = await getRepository().listCountryFeaturePolicies();
    return isFeaturePermitted(policies.find((p) => p.countryCode === countryCode && p.feature === feature));
  }

  async isPermittedBatch(countryCode: CountryCode, features: PolicyFeature[]): Promise<Record<PolicyFeature, boolean>> {
    const policies = await getRepository().listCountryFeaturePolicies();
    const out = {} as Record<PolicyFeature, boolean>;
    for (const feature of features) {
      out[feature] = isFeaturePermitted(policies.find((p) => p.countryCode === countryCode && p.feature === feature));
    }
    return out;
  }
}

let gate: PolicyGate | null = null;

/** Her modülün gated okuma/yazma yolunun başında çağırması gereken tek fonksiyon. */
export function getPolicyGate(): PolicyGate {
  gate ??= new RepositoryPolicyGate();
  return gate;
}
