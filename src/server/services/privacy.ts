import "server-only";
import { privacyRequestSchema } from "@/domain/schemas";
import type { Admin, PrivacyRequest } from "@/domain/types";
import { getRepository } from "../repositories";
import { sharedRateLimit } from "../rate-limit";
import { audit } from "./audit";
import { DomainError, RateLimitedError } from "./errors";
import { LOCALES } from "@/i18n/config";
import { SEGMENTS } from "@/i18n/routes";

const PROFILE_SEGMENTS = [...new Set(LOCALES.map((l) => SEGMENTS[l].profile))].join("|");
const PROFILE_URL = new RegExp(`/(?:[a-z]{2}/)?(?:${PROFILE_SEGMENTS})/([a-z0-9-]+)`);

/** Başvurudaki profil bağlantısından slug (tüm diller ve eski /profil/ adresleri). */
export function profileSlugFromUrl(url: string | null | undefined): string | undefined {
  return url?.match(PROFILE_URL)?.[1];
}

/** KVKK m.13: başvurular en geç 30 gün içinde sonuçlandırılır. */
export const PRIVACY_RESPONSE_DAYS = 30;

export async function submitPrivacyRequest(raw: unknown, fingerprint: string): Promise<PrivacyRequest> {
  const input = privacyRequestSchema.parse(raw);
  if (input.website) throw new DomainError("Geçersiz istek");
  if (!(await sharedRateLimit(`privacy:${fingerprint}`, 3, 3_600_000)).ok) throw new RateLimitedError();
  const repo = getRepository();
  let profileId: string | null = null;
  const slug = profileSlugFromUrl(input.profileUrl);
  if (slug) profileId = (await repo.getProfileBySlug(slug))?.id ?? null;
  const request = await repo.createPrivacyRequest({
    type: input.type,
    profileId,
    profileUrl: input.profileUrl,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    relation: input.relation,
    details: input.details,
    dueAt: new Date(Date.now() + PRIVACY_RESPONSE_DAYS * 86_400_000).toISOString(),
  });
  await audit(null, "privacy_request.create", "privacy_request", request.id, { type: request.type, profileId });
  return request;
}

export async function updatePrivacyRequestStatus(actor: Admin, id: string, status: PrivacyRequest["status"], reason?: string) {
  const updated = await getRepository().updatePrivacyRequest(id, {
    status,
    completedAt: status === "completed" || status === "rejected" ? new Date().toISOString() : null,
  });
  await audit(actor, "privacy_request.status", "privacy_request", id, reason ? { status, reason } : { status });
  return updated;
}
