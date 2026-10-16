import "server-only";
import { privacyRequestSchema } from "@/domain/schemas";
import type { Admin, PrivacyRequest } from "@/domain/types";
import { getRepository } from "../repositories";
import { rateLimit } from "../rate-limit";
import { audit } from "./audit";
import { DomainError, RateLimitedError } from "./errors";

/** KVKK m.13: başvurular en geç 30 gün içinde sonuçlandırılır. */
export const PRIVACY_RESPONSE_DAYS = 30;

export async function submitPrivacyRequest(raw: unknown, fingerprint: string): Promise<PrivacyRequest> {
  const input = privacyRequestSchema.parse(raw);
  if (input.website) throw new DomainError("Geçersiz istek");
  if (!rateLimit(`privacy:${fingerprint}`, 3, 3_600_000).ok) throw new RateLimitedError();
  const repo = getRepository();
  let profileId: string | null = null;
  const slug = input.profileUrl?.match(/\/profil\/([a-z0-9-]+)/)?.[1];
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

export async function updatePrivacyRequestStatus(actor: Admin, id: string, status: PrivacyRequest["status"]) {
  const updated = await getRepository().updatePrivacyRequest(id, {
    status,
    completedAt: status === "completed" || status === "rejected" ? new Date().toISOString() : null,
  });
  await audit(actor, "privacy_request.status", "privacy_request", id, { status });
  return updated;
}
