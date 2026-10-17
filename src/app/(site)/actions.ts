"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { invalidatePublic } from "@/server/cache";
import { clientFingerprint, rateLimit } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { DomainError } from "@/server/services/errors";
import { submitReport } from "@/server/services/moderation";
import { submitPrivacyRequest } from "@/server/services/privacy";
import { submitContactMessage } from "@/server/services/contact";

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
  let removed = false;
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
    if (autoUnpublished) {
      invalidatePublic();
      removed = true;
    }
  } catch (e) {
    return failure(e);
  }
  // Profil sayfası artık kamuya kapalı; onay ayrı bir sayfada gösterilir.
  if (removed) redirect("/bildirim-alindi");
  return { ok: true, message: "Bildiriminiz alındı. Moderasyon ekibimiz en kısa sürede inceleyecek." };
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

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const message = await submitContactMessage(
      {
        category: formData.get("category"),
        name: formData.get("name"),
        email: formData.get("email"),
        subject: formData.get("subject"),
        message: formData.get("message"),
        acknowledge: formData.get("acknowledge") === "on",
        website: formData.get("website") ?? undefined,
        startedAt: formData.get("startedAt") || undefined,
      },
      await clientFingerprint(),
    );
    return { ok: true, message: `Mesajınız alındı (no: ${message.id.slice(0, 8).toUpperCase()}). Yanıtımız belirttiğiniz e-posta adresine gönderilecektir.` };
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
