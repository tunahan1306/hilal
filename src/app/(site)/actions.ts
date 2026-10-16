"use server";

import { z } from "zod";
import { invalidatePublic } from "@/server/cache";
import { clientFingerprint, rateLimit } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { DomainError } from "@/server/services/errors";
import { submitReport } from "@/server/services/moderation";
import { submitPrivacyRequest } from "@/server/services/privacy";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string[]> } | null;

function failure(e: unknown): FormState {
  if (e instanceof z.ZodError) {
    return { ok: false, message: "Lütfen formdaki hataları düzeltin.", errors: z.flattenError(e).fieldErrors as Record<string, string[]> };
  }
  if (e instanceof DomainError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin." };
}

export async function reportProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { autoUnpublished } = await submitReport(
      {
        profileId: formData.get("profileId"),
        category: formData.get("category"),
        description: formData.get("description"),
        reporterEmail: formData.get("reporterEmail") ?? undefined,
        website: formData.get("website") ?? undefined,
      },
      await clientFingerprint(),
    );
    if (autoUnpublished) invalidatePublic();
    return {
      ok: true,
      message: autoUnpublished
        ? "Bildiriminiz alındı. Profil, inceleme tamamlanana kadar yayından kaldırıldı."
        : "Bildiriminiz alındı. Moderasyon ekibimiz en kısa sürede inceleyecek.",
    };
  } catch (e) {
    return failure(e);
  }
}

export async function privacyRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const req = await submitPrivacyRequest(
      {
        type: formData.get("type"),
        profileUrl: formData.get("profileUrl") ?? undefined,
        requesterName: formData.get("requesterName"),
        requesterEmail: formData.get("requesterEmail"),
        relation: formData.get("relation"),
        details: formData.get("details"),
        acknowledge: formData.get("acknowledge") === "on",
        website: formData.get("website") ?? undefined,
      },
      await clientFingerprint(),
    );
    return {
      ok: true,
      message: `Başvurunuz alındı (no: ${req.id.slice(0, 8).toUpperCase()}). KVKK kapsamında en geç 30 gün içinde e-posta ile yanıtlanacaktır.`,
    };
  } catch (e) {
    return failure(e);
  }
}

/** Profil görüntüleme sayacı: aynı ziyaretçi/profil için saatte bir kez sayılır. */
export async function trackProfileViewAction(profileId: string): Promise<void> {
  if (typeof profileId !== "string" || profileId.length > 64) return;
  const fp = await clientFingerprint();
  if (!rateLimit(`view:${fp}:${profileId}`, 1, 3_600_000).ok) return;
  const repo = getRepository();
  const profile = await repo.getProfile(profileId);
  if (!profile || profile.status !== "published") return;
  await repo.recordProfileView(profileId, new Date().toISOString().slice(0, 10));
}
