"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { invalidatePublic } from "@/server/cache";
import { logError } from "@/server/log";
import { clientFingerprint, rateLimit } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { DomainError } from "@/server/services/errors";
import { submitReport } from "@/server/services/moderation";
import { submitPrivacyRequest } from "@/server/services/privacy";
import { submitContactMessage } from "@/server/services/contact";
import { DEFAULT_LOCALE, fmt, isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routes";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string[]> } | null;

/** Server Action'lar kök parametreyi okuyamaz; dil formdaki gizli alandan gelir. */
function langOf(formData: FormData): Locale {
  const v = formData.get("lang");
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

const LOCALIZED_CODES = new Set(["rate_limited", "duplicate", "spam", "contact_unavailable"]);

/**
 * Hata yanıtı. Doğrulama mesajları (zod) Türkçe yazılmıştır: Türkçe dışında her hatalı
 * alan için dile uygun genel bir uyarı döner. Bilinen alan hataları çevrilmiş koduyla gelir.
 */
function failure(e: unknown, lang: Locale): FormState {
  const m = getMessages(lang).errors;
  if (e instanceof z.ZodError) {
    const fields = z.flattenError(e).fieldErrors as Record<string, string[]>;
    const errors = lang === "tr" ? fields : Object.fromEntries(Object.keys(fields).map((k) => [k, [m.invalidField]]));
    return { ok: false, message: m.fixFields, errors };
  }
  if (e instanceof DomainError) {
    if (LOCALIZED_CODES.has(e.code)) return { ok: false, message: m[e.code as keyof typeof m] };
    return { ok: false, message: lang === "tr" ? e.message : m.generic };
  }
  logError("site.action", e);
  return { ok: false, message: m.generic };
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
    return failure(e, langOf(formData));
  }
  // Profil sayfası artık kamuya kapalı; onay ayrı bir sayfada gösterilir.
  if (removed) redirect(localizedPath(langOf(formData), "reported"));
  return { ok: true, message: getMessages(langOf(formData)).report.received };
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
    return { ok: true, message: fmt(getMessages(langOf(formData)).removal.received, { id: req.id.slice(0, 8).toUpperCase() }) };
  } catch (e) {
    return failure(e, langOf(formData));
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
    return { ok: true, message: fmt(getMessages(langOf(formData)).contact.received, { id: message.id.slice(0, 8).toUpperCase() }) };
  } catch (e) {
    return failure(e, langOf(formData));
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
