import "server-only";
import { z } from "zod";
import { COUNTRY_CODES } from "@/domain/countries";
import { decisionProblems, PUBLICATION_STATUSES, type CountryDecision } from "@/domain/country-policy";
import type { Admin } from "@/domain/types";
import { getRepository } from "../repositories";
import { audit } from "./audit";
import { DomainError } from "./errors";

export const countryDecisionSchema = z.object({
  countryCode: z.enum(COUNTRY_CODES),
  status: z.enum(PUBLICATION_STATUSES),
  approverName: z.string().trim().min(2, "Sorumlu kişinin adı gerekli").max(120),
  evidenceRef: z.string().trim().max(500).transform((v) => v || null),
  reviewDue: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Geçerli bir tarih girin").transform((v) => v || null),
  restrictions: z.string().trim().max(1000).transform((v) => v || null),
  note: z.string().trim().max(1000).transform((v) => v || null),
  /** Hassas işlem onayı: yönetici ülke kodunu yeniden yazar. */
  confirm: z.string().trim(),
});
export type CountryDecisionInput = z.input<typeof countryDecisionSchema>;

/**
 * Ülke yayın kararı kaydeder. Yalnızca sahip rolü; karar yalnızca eklenir. Veritabanında aynı
 * kurallar RLS, kısıt ve tetikleyiciyle de uygulanır (servis anahtarı RLS'i atladığı için
 * sahip kontrolü burada zorunludur). Bu işlem hukuki onay ÜRETMEZ: kaydedilen kişi ve belge
 * referansı gerçek bir değerlendirmeye dayanmalıdır.
 */
export async function recordCountryDecision(actor: Admin, raw: CountryDecisionInput, now = new Date()): Promise<CountryDecision> {
  if (actor.role !== "owner") throw new DomainError("Ülke yayın kararını yalnızca sahip rolündeki yönetici kaydedebilir", "forbidden");
  const input = countryDecisionSchema.parse(raw);
  if (input.confirm.toLowerCase() !== input.countryCode) throw new DomainError("Onay için ülke kodunu doğru yazın");
  const problems = decisionProblems(input, now);
  if (problems.length) throw new DomainError(problems.join("; "));
  const row = await getRepository().addCountryDecision({
    countryCode: input.countryCode, status: input.status, approverName: input.approverName, evidenceRef: input.evidenceRef,
    reviewDue: input.reviewDue, restrictions: input.restrictions, note: input.note, decidedBy: actor.id,
  });
  // Veritabanı tetikleyicisi ayrıca denetim kaydı yazar; bu kayıt uygulama tarafındaki iz içindir.
  await audit(actor, "country.decision.recorded", "country", row.countryCode, { decisionId: row.id, status: row.status });
  return row;
}
