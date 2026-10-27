import "server-only";
import { z } from "zod";
import { REPORT_CATEGORIES, type Admin, type ModerationReport } from "@/domain/types";
import { CONTENT_TRIAGE_ACTIONS, REPORTABLE_CONTENT_TYPES, type ContentTriageAction, type ModerationContentType } from "@/domain/moderation";
import { getRepository } from "../repositories";
import { sharedRateLimit } from "../rate-limit";
import { audit } from "./audit";
import { DomainError, RateLimitedError } from "./errors";
import { suspendCreatorAccount } from "./creator";

const HOUR = 3_600_000;
export const CONTENT_REPORTS_PER_HOUR = 5;
/** Aynı hedefe saatte kabul edilen en fazla şikâyet — countRecentReportsForProfile'ın genelleştirilmiş eşdeğeri. */
export const CONTENT_REPORTS_PER_TARGET_PER_HOUR = 10;

export const submitContentReportInputSchema = z.object({
  contentType: z.enum(REPORTABLE_CONTENT_TYPES),
  contentId: z.string().trim().min(1, "İçerik kimliği gerekli"),
  category: z.enum(REPORT_CATEGORIES),
  description: z.string().trim().min(10, "Açıklama en az 10 karakter olmalı").max(1000),
  reporterEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null),
});
export type SubmitContentReportInput = z.input<typeof submitContentReportInputSchema>;

async function assertContentExists(repo: ReturnType<typeof getRepository>, contentType: Exclude<ModerationContentType, "profile">, contentId: string): Promise<void> {
  const exists = await (async () => {
    switch (contentType) {
      case "user_profile":
        return Boolean(await repo.getUserProfileById(contentId));
      case "post":
        return Boolean(await repo.getPost(contentId));
      case "message":
        return Boolean(await repo.getMessageById(contentId));
      case "media_asset":
        return Boolean(await repo.getMediaAsset(contentId));
      case "creator_account":
        return Boolean(await repo.getCreatorAccountById(contentId));
    }
  })();
  if (!exists) throw new DomainError("Bildirilen içerik bulunamadı", "not_found");
}

/** İçeriğin sahibi app_user — "suspend_account" triyaj eyleminin hedefi. message/creator_account dahil tüm tiplerde çözülür. */
async function resolveContentOwner(repo: ReturnType<typeof getRepository>, contentType: Exclude<ModerationContentType, "profile">, contentId: string): Promise<string | null> {
  switch (contentType) {
    case "user_profile":
      return (await repo.getUserProfileById(contentId))?.userId ?? null;
    case "post":
      return (await repo.getPost(contentId))?.authorId ?? null;
    case "message":
      return (await repo.getMessageById(contentId))?.senderId ?? null;
    case "media_asset":
      return (await repo.getMediaAsset(contentId))?.ownerId ?? null;
    case "creator_account":
      return (await repo.getCreatorAccountById(contentId))?.userId ?? null;
  }
}

/**
 * Modül B/C içeriği için genelleştirilmiş şikâyet — admin-küratörlü keşif ürününün
 * submitReport'una AYRI (bkz. src/server/services/moderation.ts), aynı oran sınırlama
 * disiplinini uygular. Kritik kategoriler burada otomatik eyleme yol AÇMAZ (profil
 * ürününün auto-unpublish breaker'ı bu ürün için kasıtlı olarak kopyalanmadı) — admin
 * her zaman elle triyaj eder, bkz. triageContentReport.
 */
export async function submitContentReport(raw: SubmitContentReportInput, fingerprint: string): Promise<ModerationReport> {
  const input = submitContentReportInputSchema.parse(raw);
  const repo = getRepository();

  if (!(await sharedRateLimit(`content-report:${fingerprint}`, CONTENT_REPORTS_PER_HOUR, HOUR)).ok) throw new RateLimitedError();
  const recentByHash = await repo.countRecentReportsByHash(fingerprint, new Date(Date.now() - HOUR).toISOString());
  if (recentByHash >= CONTENT_REPORTS_PER_HOUR) throw new RateLimitedError();

  await assertContentExists(repo, input.contentType, input.contentId);
  const since = new Date(Date.now() - HOUR).toISOString();
  if ((await repo.countRecentReportsForContent(input.contentType, input.contentId, since)) >= CONTENT_REPORTS_PER_TARGET_PER_HOUR) {
    throw new DomainError("Bu içerik için çok sayıda bildirim alındı ve inceleme sürüyor. Teşekkür ederiz.", "rate_limited");
  }

  const report = await repo.createReport({
    profileId: null,
    contentType: input.contentType,
    contentId: input.contentId,
    category: input.category,
    description: input.description,
    reporterEmail: input.reporterEmail,
    reporterHash: fingerprint,
  });
  await audit(null, "content_report.create", "moderation_report", report.id, { contentType: input.contentType, contentId: input.contentId, category: input.category });
  return report;
}

async function mustGetContentReport(id: string): Promise<ModerationReport> {
  const r = await getRepository().getReport(id);
  if (!r) throw new DomainError("Şikâyet bulunamadı", "not_found");
  // Simetrik koruma: bu modül yalnızca Modül B/C içeriğini triyaj eder; profil şikâyetleri
  // için src/server/services/moderation.ts kullanılır.
  if (r.contentType === "profile") throw new DomainError("Bu şikâyet bir profil için; admin-küratörlü ürünün kendi triyajını kullanın", "wrong_content_type");
  return r;
}

export const triageContentReportInputSchema = z.object({
  action: z.enum(CONTENT_TRIAGE_ACTIONS),
  note: z.string().trim().max(1000).optional(),
});
export type TriageContentReportInput = z.input<typeof triageContentReportInputSchema>;

/**
 * Modül B/C içeriği için triyaj — admin-küratörlü ürünün resolveReport'undan KASITLI
 * OLARAK AYRI bir fonksiyon (farklı hedef şekli: profiles değil, posts/user_profiles/
 * media_assets/messages/creator_accounts).
 */
export async function triageContentReport(actor: Admin, reportId: string, raw: TriageContentReportInput): Promise<void> {
  const input = triageContentReportInputSchema.parse(raw);
  const report = await mustGetContentReport(reportId);
  if (report.status === "resolved" || report.status === "rejected") throw new DomainError("Şikâyet zaten sonuçlandırılmış");
  const repo = getRepository();
  const contentType = report.contentType as Exclude<ModerationContentType, "profile">;

  switch (input.action as ContentTriageAction) {
    case "dismiss": {
      await repo.updateReport(reportId, { status: "rejected", resolution: input.note ?? "Reddedildi" });
      await repo.addModerationAction({ reportId, profileId: null, contentType, contentId: report.contentId, type: "report_rejected", note: input.note ?? null, actorId: actor.id });
      break;
    }
    case "warn": {
      const ownerId = await resolveContentOwner(repo, contentType, report.contentId);
      if (ownerId) {
        await repo.addNotification({ userId: ownerId, type: "moderation_warning", payload: { reportId, contentType, note: input.note ?? null } });
      }
      await repo.updateReport(reportId, { status: "resolved", resolution: input.note ?? "Uyarı gönderildi" });
      await repo.addModerationAction({ reportId, profileId: null, contentType, contentId: report.contentId, type: "warning_issued", note: input.note ?? null, actorId: actor.id });
      break;
    }
    case "remove_content": {
      if (contentType === "creator_account") {
        await suspendCreatorAccount(actor, report.contentId);
      } else {
        await repo.setContentModerationStatus(contentType, report.contentId, "rejected", actor.id);
      }
      await repo.updateReport(reportId, { status: "resolved", resolution: input.note ?? "İçerik kaldırıldı" });
      await repo.addModerationAction({ reportId, profileId: null, contentType, contentId: report.contentId, type: "content_rejected", note: input.note ?? null, actorId: actor.id });
      break;
    }
    case "suspend_account": {
      const ownerId = await resolveContentOwner(repo, contentType, report.contentId);
      if (!ownerId) throw new DomainError("İçerik sahibi bulunamadı", "not_found");
      await repo.updateAppUserStatus(ownerId, "suspended", actor.id);
      await repo.updateReport(reportId, { status: "resolved", resolution: input.note ?? "Hesap askıya alındı" });
      await repo.addModerationAction({ reportId, profileId: null, contentType, contentId: report.contentId, type: "account_suspended", note: input.note ?? null, actorId: actor.id });
      break;
    }
  }
  await audit(actor, `content_report.${input.action}`, "moderation_report", reportId, { contentType, contentId: report.contentId, note: input.note ?? null });
}
