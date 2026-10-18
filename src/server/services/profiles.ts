import "server-only";
import { randomBytes } from "node:crypto";
import { normalizeWhatsAppPhone } from "@/domain/whatsapp";
import { isAdult } from "@/domain/age";
import { requiresEscalation, scanProfileContent } from "@/domain/content-policy";
import { countryOfPlate } from "@/domain/countries";
import { isPublishable } from "@/domain/country-policy";
import { getLocationDirectory } from "../queries/locations";
import { activeConsent, canTransition, evaluatePublishReadiness, PROFILE_STATUS_LABELS } from "@/domain/publishing";
import type { ProfileInput } from "@/domain/schemas";
import { slugifyTr } from "@/domain/text";
import type { Admin, ConsentType, Profile, ProfileStatus, VerificationStatus, VerificationType } from "@/domain/types";
import { getRepository } from "../repositories";
import { audit } from "./audit";
import { DomainError, PublishBlockedError } from "./errors";
import { validateDocument } from "./images";
import { purgeProfileMedia, syncPublicMedia } from "./media";

const DAY = 86_400_000;

function verificationRetentionDays(): number {
  const n = Number(process.env.VERIFICATION_DOC_RETENTION_DAYS ?? 30);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

async function assertLocation(input: Pick<ProfileInput, "provincePlate" | "districtSlug">) {
  const { getProvinceByPlate, listDistricts } = await getLocationDirectory();
  const province = getProvinceByPlate(input.provincePlate);
  if (!province) throw new DomainError("Geçersiz il");
  if (input.districtSlug && !listDistricts(province.plate).some((d) => d.slug === input.districtSlug)) {
    throw new DomainError("İlçe seçilen ile ait değil");
  }
}

async function assertInterests(ids: string[]) {
  const known = new Set((await getRepository().listInterests()).map((i) => i.id));
  if (ids.some((id) => !known.has(id))) throw new DomainError("Geçersiz ilgi alanı");
}

async function mustGetProfile(id: string): Promise<Profile> {
  const p = await getRepository().getProfile(id);
  if (!p) throw new DomainError("Profil bulunamadı", "not_found");
  return p;
}

async function phoneUsedByOtherPublished(id: string, phone: string): Promise<boolean> {
  return (await getRepository().listProfiles()).some((o) => o.id !== id && o.status === "published" && o.whatsappPhone === phone);
}

/** Yayındaki profil kapalı ülkeye taşınamaz ve başka yayındaki profilin numarasını alamaz (veritabanı tetikleyicisiyle aynı kural). */
async function assertPublishedConstraints(current: Profile, next: { provincePlate: number; whatsappPhone: string | null }) {
  if (current.status !== "published") return;
  if (countryOfPlate(next.provincePlate) !== countryOfPlate(current.provincePlate) || next.provincePlate !== current.provincePlate) {
    const policies = await getRepository().listCountryPolicies();
    if (!isPublishable(policies.find((p) => p.code === countryOfPlate(next.provincePlate)))) {
      throw new DomainError("Yayındaki profil, yayın kararı olmayan bir ülkeye taşınamaz; önce yayından kaldırın");
    }
  }
  if (next.whatsappPhone && next.whatsappPhone !== current.whatsappPhone && (await phoneUsedByOtherPublished(current.id, next.whatsappPhone))) {
    throw new DomainError("Bu WhatsApp numarası başka bir yayındaki profilde kullanılıyor");
  }
}

export async function loadPublishContext(profileId: string, now = new Date()) {
  const repo = getRepository();
  const profile = await mustGetProfile(profileId);
  const [consents, verifications, media, reports, interests, policies] = await Promise.all([
    repo.listConsents(profileId),
    repo.listVerifications(profileId),
    repo.listMedia(profileId),
    repo.listReports({ profileId }),
    repo.listInterests(),
    repo.listCountryPolicies(),
  ]);
  const countryPublishable = isPublishable(policies.find((p) => p.code === countryOfPlate(profile.provincePlate)), now);
  const phoneInUseElsewhere = profile.whatsappPhone ? await phoneUsedByOtherPublished(profile.id, profile.whatsappPhone) : false;
  const interestNames = interests.filter((i) => profile.interestIds.includes(i.id)).map((i) => i.name);
  const linkAllowlist = (process.env.BIO_LINK_ALLOWLIST ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return { profile, consents, verifications, media, reports, interestNames, now, linkAllowlist, countryPublishable, phoneInUseElsewhere };
}

function whatsAppFields(input: ProfileInput, current?: Profile) {
  const phone = input.whatsappPhone?.trim() ? normalizeWhatsAppPhone(input.whatsappPhone) : null;
  if (input.whatsappPhone?.trim() && !phone) throw new DomainError("Geçerli bir Türkiye cep telefonu numarası girin");
  if (input.whatsappConsent && !phone) throw new DomainError("Paylaşım izni için geçerli numara gerekli");
  const consentAt = input.whatsappConsent && phone
    ? (current?.whatsappPhone === phone && current.whatsappConsentAt ? current.whatsappConsentAt : new Date().toISOString())
    : null;
  return { whatsappPhone: phone, whatsappConsentAt: consentAt };
}

export async function createProfile(actor: Admin, input: ProfileInput): Promise<Profile> {
  await assertLocation(input);
  await assertInterests(input.interestIds);
  const slug = `${slugifyTr(input.nickname) || "profil"}-${randomBytes(3).toString("hex")}`;
  const profile = await getRepository().createProfile({
    slug,
    ...whatsAppFields(input),
    nickname: input.nickname,
    birthDate: input.birthDate,
    provincePlate: input.provincePlate,
    districtSlug: input.districtSlug,
    bio: input.bio,
    bioDoc: input.bioDoc,
    interestIds: input.interestIds,
    status: "draft",
    moderationStatus: "pending",
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    noindex: input.noindex,
    createdBy: actor.id,
  });
  const findings = scanProfileContent({ nickname: input.nickname, bio: input.bio });
  // Reşit olmayan / istismar göstergesi: denetim kaydında insan incelemesine yükseltme işareti.
  await audit(actor, "profile.create", "profile", profile.id, { findings: findings.map((f) => f.rule), escalated: requiresEscalation(findings) });
  return profile;
}

/**
 * Yayındaki bir profilin görünen içeriği değişirse profil yeniden moderasyona
 * düşer ve yayından kalkar: onaylanmamış içerik hiçbir zaman yayında kalmaz.
 */
export async function updateProfile(actor: Admin, id: string, input: ProfileInput): Promise<{ profile: Profile; requeued: boolean }> {
  await assertLocation(input);
  await assertInterests(input.interestIds);
  const current = await mustGetProfile(id);
  if (current.status === "archived") throw new DomainError("Arşivlenmiş profil düzenlenemez; önce taslağa alın");
  const contact = whatsAppFields(input, current);
  await assertPublishedConstraints(current, { provincePlate: input.provincePlate, whatsappPhone: contact.whatsappPhone });
  const contactChanged = (current.whatsappPhone ?? null) !== contact.whatsappPhone || (current.whatsappConsentAt ?? null) !== contact.whatsappConsentAt;
  const contentChanged =
    contactChanged ||
    current.nickname !== input.nickname ||
    current.bio !== input.bio ||
    JSON.stringify(current.bioDoc) !== JSON.stringify(input.bioDoc) ||
    current.interestIds.slice().sort().join() !== input.interestIds.slice().sort().join();
  const requeue = contentChanged && (current.moderationStatus === "approved" || current.status === "published");
  const profile = await getRepository().updateProfile(id, {
    ...contact,
    nickname: input.nickname,
    birthDate: input.birthDate,
    provincePlate: input.provincePlate,
    districtSlug: input.districtSlug,
    bio: input.bio,
    bioDoc: input.bioDoc,
    interestIds: input.interestIds,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    noindex: input.noindex,
    ...(requeue
      ? { moderationStatus: "pending" as const, status: current.status === "published" ? ("in_review" as const) : current.status }
      : {}),
  });
  const findings = scanProfileContent({ nickname: input.nickname, bio: input.bio });
  await audit(actor, "profile.update", "profile", id, { requeued: requeue, contactChanged, whatsappPublicationAllowed: Boolean(contact.whatsappConsentAt), findings: findings.map((f) => f.rule), escalated: requiresEscalation(findings) });
  if (requeue) await syncPublicMedia(id);
  return { profile, requeued: requeue };
}

async function transition(actor: Admin, id: string, to: ProfileStatus, extra: Partial<Profile> = {}, meta: Record<string, unknown> = {}) {
  const current = await mustGetProfile(id);
  if (!canTransition(current.status, to)) {
    throw new DomainError(`"${PROFILE_STATUS_LABELS[current.status]}" durumundan "${PROFILE_STATUS_LABELS[to]}" durumuna geçilemez`);
  }
  const profile = await getRepository().updateProfile(id, { status: to, ...extra });
  await audit(actor, `profile.${to}`, "profile", id, { from: current.status, ...meta });
  // Yalnızca yayındaki profillerin onaylı medyası herkese açık depoda bulunur
  await syncPublicMedia(id);
  return profile;
}

export async function submitForReview(actor: Admin, id: string) {
  return transition(actor, id, "in_review");
}

export async function setModeration(actor: Admin, id: string, decision: "approved" | "rejected", note: string | null) {
  const current = await mustGetProfile(id);
  if (decision === "approved") {
    const findings = scanProfileContent({ nickname: current.nickname, bio: current.bio });
    if (findings.some((f) => f.severity === "block")) {
      throw new DomainError(`İçerik politikası ihlali varken onaylanamaz: ${findings.map((f) => f.message).join(", ")}`);
    }
  }
  const profile = await getRepository().updateProfile(id, {
    moderationStatus: decision,
    moderationNote: note,
    moderatedBy: actor.id,
    moderatedAt: new Date().toISOString(),
    // Reddedilen profil yayında kalamaz.
    ...(decision === "rejected" && current.status === "published" ? { status: "unpublished" as const } : {}),
  });
  await audit(actor, `profile.moderation.${decision}`, "profile", id, { note });
  await syncPublicMedia(id);
  return profile;
}

export async function publishProfile(actor: Admin, id: string, now = new Date()) {
  const ctx = await loadPublishContext(id, now);
  const readiness = evaluatePublishReadiness(ctx);
  if (!readiness.ready) {
    const failed = readiness.checks.filter((c) => !c.passed).map((c) => c.label);
    await audit(actor, "profile.publish_blocked", "profile", id, { failed });
    throw new PublishBlockedError(failed);
  }
  return transition(actor, id, "published", { publishedAt: ctx.profile.publishedAt ?? now.toISOString(), archivedAt: null });
}

export async function unpublishProfile(actor: Admin, id: string, reason: string) {
  return transition(actor, id, "unpublished", {}, { reason });
}

export async function archiveProfile(actor: Admin, id: string) {
  return transition(actor, id, "archived", { archivedAt: new Date().toISOString() });
}

export async function restoreToDraft(actor: Admin, id: string) {
  return transition(actor, id, "draft", { archivedAt: null, moderationStatus: "pending" });
}

/** KVKK silme: profil, görseller ve özel belgeler kalıcı olarak silinir. */
export async function deleteProfilePermanently(actor: Admin, id: string, reason: string) {
  const repo = getRepository();
  await mustGetProfile(id); // yoksa anlaşılır hata
  const [consents, verifications] = await Promise.all([repo.listConsents(id), repo.listVerifications(id)]);
  await purgeProfileMedia(id);
  await Promise.all([
    ...consents.filter((c) => c.evidencePath).map((c) => repo.removePrivateDocument(c.evidencePath!)),
    ...verifications.filter((v) => v.documentPath).map((v) => repo.removePrivateDocument(v.documentPath!)),
  ]);
  await repo.deleteProfile(id);
  // Denetim kaydında kişisel veri tutulmaz; yalnızca kimlik ve gerekçe.
  await audit(actor, "profile.delete", "profile", id, { reason });
}

// ---------------------------------------------------------------------------
// Rıza ve doğrulama
// ---------------------------------------------------------------------------
export async function recordConsent(actor: Admin, profileId: string, type: ConsentType, method: string, evidence?: Buffer) {
  const repo = getRepository();
  await mustGetProfile(profileId);
  if (activeConsent(await repo.listConsents(profileId), type)) throw new DomainError("Bu türde aktif bir rıza kaydı zaten var");
  let evidencePath: string | null = null;
  if (evidence && evidence.length) {
    const contentType = validateDocument(evidence);
    evidencePath = `consent-documents/${profileId}/${crypto.randomUUID()}`;
    await repo.storePrivateDocument(evidencePath, evidence, contentType);
  }
  const consent = await repo.addConsent({
    profileId,
    type,
    grantedAt: new Date().toISOString(),
    evidencePath,
    method,
    recordedBy: actor.id,
  });
  await audit(actor, "consent.grant", "profile", profileId, { type, consentId: consent.id });
  return consent;
}

/** Rıza geri alınırsa profil derhal yayından kalkar (DB tetikleyicisiyle aynı kural). */
export async function revokeConsent(actor: Admin, profileId: string, consentId: string) {
  const repo = getRepository();
  const consent = (await repo.listConsents(profileId)).find((c) => c.id === consentId);
  if (!consent) throw new DomainError("Rıza kaydı bulunamadı");
  if (consent.revokedAt) return consent;
  const revoked = await repo.revokeConsent(consentId, new Date().toISOString());
  const profile = await mustGetProfile(profileId);
  if ((consent.type === "publication" || consent.type === "photo_rights") && profile.status === "published") {
    await repo.updateProfile(profileId, { status: "unpublished" });
    await audit(actor, "profile.auto_unpublished", "profile", profileId, { reason: `consent_revoked:${consent.type}` });
  }
  if (consent.type === "photo_rights") {
    // Medya kullanım izni geri alındı: tüm medyanın hak ve yayın onayı düşer
    const media = await repo.listMedia(profileId);
    await Promise.all(
      media.map((m) => repo.updateMedia(m.id, { rightsConfirmed: false, ownershipSource: null, rightsConfirmedBy: null, rightsConfirmedAt: null, moderation: "pending", moderatedBy: null, moderatedAt: null })),
    );
  }
  await syncPublicMedia(profileId);
  await audit(actor, "consent.revoke", "profile", profileId, { type: consent.type, consentId });
  return revoked;
}

export async function recordVerification(
  actor: Admin,
  profileId: string,
  input: { type: VerificationType; status: VerificationStatus; method: string; note: string | null },
  document?: Buffer,
) {
  const repo = getRepository();
  const profile = await mustGetProfile(profileId);
  if (input.type === "age" && input.status === "approved") {
    if (!isAdult(profile.birthDate, new Date())) throw new DomainError("Doğum tarihine göre profil sahibi 18 yaşından küçük");
  }
  let documentPath: string | null = null;
  let retainUntil: string | null = null;
  if (document && document.length) {
    const contentType = validateDocument(document);
    documentPath = `verification-documents/${profileId}/${crypto.randomUUID()}`;
    await repo.storePrivateDocument(documentPath, document, contentType);
    retainUntil = new Date(Date.now() + verificationRetentionDays() * DAY).toISOString();
  }
  const now = new Date().toISOString();
  const record = await repo.addVerification({
    profileId,
    type: input.type,
    status: input.status,
    method: input.method,
    documentPath,
    checkedBy: actor.id,
    checkedAt: now,
    retainUntil,
    note: input.note,
  });
  await audit(actor, "verification.record", "profile", profileId, { type: input.type, status: input.status });
  return record;
}

/** Saklama süresi dolan doğrulama belgelerini siler (kayıt kalır, belge gider). */
export async function purgeExpiredVerificationDocuments(now = new Date()): Promise<number> {
  const repo = getRepository();
  const expired = await repo.listExpiredVerificationDocuments(now.toISOString());
  for (const v of expired) {
    if (v.documentPath) await repo.removePrivateDocument(v.documentPath);
    await repo.clearVerificationDocument(v.id);
    await audit(null, "verification.document_purged", "profile", v.profileId, { verificationId: v.id });
  }
  return expired.length;
}

/** KVKK erişim talebi için profil verisinin dışa aktarımı. */
export async function exportProfileData(actor: Admin, profileId: string) {
  const repo = getRepository();
  const profile = await mustGetProfile(profileId);
  const [media, consents, verifications, subscriptions, reports] = await Promise.all([
    repo.listMedia(profileId),
    repo.listConsents(profileId),
    repo.listVerifications(profileId),
    repo.listSubscriptions({ profileId }),
    repo.listReports({ profileId }),
  ]);
  await audit(actor, "profile.export", "profile", profileId);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    media: media.map(({ kind, alt, mimeType, bytes, createdAt, ownershipSource, rightsConfirmedAt, moderation }) => ({ kind, alt, mimeType, bytes, createdAt, ownershipSource, rightsConfirmedAt, moderation })),
    consents: consents.map(({ type, grantedAt, revokedAt, method }) => ({ type, grantedAt, revokedAt, method })),
    verifications: verifications.map(({ type, status, checkedAt, method }) => ({ type, status, checkedAt, method })),
    subscriptions,
    reportsCount: reports.length,
  };
}

export async function provinceLabel(p: Pick<Profile, "provincePlate" | "districtSlug">): Promise<string> {
  const { getProvinceByPlate, listDistricts } = await getLocationDirectory();
  const province = getProvinceByPlate(p.provincePlate);
  if (!province) return "—";
  const district = p.districtSlug ? listDistricts(province.plate).find((d) => d.slug === p.districtSlug) : undefined;
  return district ? `${district.name}, ${province.name}` : province.name;
}

/** Compatibility entry points for the existing image manager. */
export async function uploadProfileImage(actor: Admin, profileId: string, data: Buffer, alt: string) {
  const { requestUpload, finalizeUpload, updateMediaAlt } = await import("./media");
  const { getStorage } = await import("../storage");
  const { sniffImageType } = await import("./images");
  const mimeType = sniffImageType(data);
  if (!mimeType) throw new DomainError("Geçersiz görsel");
  const ticket = await requestUpload(actor, profileId, { mimeType, bytes: data.length, fileName: "image" });
  const record = await getRepository().getMedia(ticket.mediaId);
  await getStorage().writePrivate(record!.storagePath, data, mimeType);
  const result = await finalizeUpload(actor, ticket.mediaId);
  if (result.media.status !== "ready") throw new DomainError(result.media.failureReason ?? "Görsel işlenemedi");
  await updateMediaAlt(actor, ticket.mediaId, alt);
  return (await getRepository().getMedia(ticket.mediaId))!;
}
export async function confirmImageRights(actor: Admin, profileId: string, imageId: string, confirmed: boolean) {
  const m = await getRepository().getMedia(imageId);
  if (m?.profileId !== profileId) throw new DomainError("Görsel bulunamadı");
  const { setMediaRights, moderateMedia } = await import("./media");
  await setMediaRights(actor, imageId, { confirmed, source: confirmed ? "owner" : null, note: "Yönetici tarafından kullanım hakkı ve yayın onayı" });
  if (confirmed) await moderateMedia(actor, [imageId], "approved");
}
export async function deleteProfileImage(actor: Admin, profileId: string, imageId: string) {
  if ((await getRepository().getMedia(imageId))?.profileId !== profileId) throw new DomainError("Görsel bulunamadı");
  await (await import("./media")).deleteMedia(actor, imageId);
}
export async function moveProfileImage(actor: Admin, profileId: string, imageId: string, direction: number) {
  const items = await getRepository().listMedia(profileId);
  const index = items.findIndex((m) => m.id === imageId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  await (await import("./media")).reorderMedia(actor, profileId, items.map((m) => m.id));
}
