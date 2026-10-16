import "server-only";
import { reportInputSchema, type ReportInput } from "@/domain/schemas";
import { CRITICAL_REPORT_CATEGORIES, type Admin, type ModerationActionType, type ModerationReport } from "@/domain/types";
import { getRepository } from "../repositories";
import { rateLimit } from "../rate-limit";
import { audit } from "./audit";
import { DomainError, RateLimitedError } from "./errors";

const HOUR = 3_600_000;
export const REPORTS_PER_HOUR = 5;
/** Aynı profile saatte kabul edilen en fazla şikâyet (IP'den bağımsız). */
export const REPORTS_PER_PROFILE_PER_HOUR = 10;
/**
 * Site genelinde saatte en fazla otomatik yayından kaldırma. Aşılırsa (olası
 * toplu sahte şikâyet saldırısı) yeni kritik şikâyetler profili kaldırmaz,
 * öncelikli inceleme kuyruğuna düşer.
 */
export const AUTO_UNPUBLISH_PER_HOUR = 10;

/**
 * Ziyaretçi şikâyeti. Oran sınırlaması iki katmanlıdır: süreç içi sayaç ve
 * veritabanındaki son bir saatlik kayıt sayısı (instance'lar arası tutarlı).
 * Kritik kategorilerde profil inceleme tamamlanana kadar otomatik olarak
 * yayından kaldırılır.
 */
export async function submitReport(raw: unknown, fingerprint: string): Promise<{ report: ModerationReport; autoUnpublished: boolean }> {
  const input: ReportInput = reportInputSchema.parse(raw);
  if (input.website) throw new DomainError("Geçersiz istek");
  const repo = getRepository();
  const settings = await repo.getSiteSettings();
  if (!settings.reportsEnabled) throw new DomainError("Şikâyet sistemi geçici olarak kapalı");

  if (!rateLimit(`report:${fingerprint}`, REPORTS_PER_HOUR, HOUR).ok) throw new RateLimitedError();
  const recent = await repo.countRecentReportsByHash(fingerprint, new Date(Date.now() - HOUR).toISOString());
  if (recent >= REPORTS_PER_HOUR) throw new RateLimitedError();

  const profile = await repo.getProfile(input.profileId);
  if (!profile || profile.status !== "published") throw new DomainError("Profil bulunamadı", "not_found");
  const since = new Date(Date.now() - HOUR).toISOString();
  if ((await repo.countRecentReportsForProfile(profile.id, since)) >= REPORTS_PER_PROFILE_PER_HOUR) {
    throw new DomainError("Bu profil için çok sayıda bildirim alındı ve inceleme sürüyor. Teşekkür ederiz.", "rate_limited");
  }

  const report = await repo.createReport({
    profileId: profile.id,
    category: input.category,
    description: input.description,
    reporterEmail: input.reporterEmail,
    reporterHash: fingerprint,
  });
  await audit(null, "report.create", "report", report.id, { category: report.category, profileId: profile.id });

  let autoUnpublished = false;
  const critical = CRITICAL_REPORT_CATEGORIES.includes(report.category);
  const breakerOpen = critical && (await repo.countRecentModerationActions("auto_unpublished", since)) >= AUTO_UNPUBLISH_PER_HOUR;
  if (breakerOpen) {
    await audit(null, "report.auto_unpublish_suppressed", "report", report.id, { category: report.category, profileId: profile.id });
  }
  if (critical && !breakerOpen) {
    await repo.updateProfile(profile.id, { status: "unpublished" });
    await repo.addModerationAction({
      reportId: report.id,
      profileId: profile.id,
      type: "auto_unpublished",
      note: `Kritik kategori: ${report.category}`,
      actorId: null,
    });
    await audit(null, "profile.auto_unpublished", "profile", profile.id, { reportId: report.id, category: report.category });
    autoUnpublished = true;
  }
  return { report, autoUnpublished };
}

async function mustGetReport(id: string): Promise<ModerationReport> {
  const r = await getRepository().getReport(id);
  if (!r) throw new DomainError("Şikâyet bulunamadı", "not_found");
  return r;
}

async function act(actor: Admin, report: ModerationReport, type: ModerationActionType, note: string | null) {
  await getRepository().addModerationAction({ reportId: report.id, profileId: report.profileId, type, note, actorId: actor.id });
  await audit(actor, `report.${type}`, "report", report.id, { note });
}

export async function startReview(actor: Admin, id: string) {
  const report = await mustGetReport(id);
  if (report.status !== "open" && report.status !== "appealed") throw new DomainError("Bu şikâyet incelemeye alınamaz");
  await getRepository().updateReport(id, { status: "in_review" });
  await act(actor, report, "review_started", null);
}

/**
 * Şikâyeti sonuçlandırır.
 * - remove: profil yayından kaldırılır, içerik kaldırma kaydı oluşur
 * - keep: şikâyet reddedilir; otomatik kaldırılmış profil incelemeye alınır
 */
export async function resolveReport(actor: Admin, id: string, decision: "remove" | "keep", note: string) {
  if (note.trim().length < 5) throw new DomainError("Karar gerekçesi en az 5 karakter olmalı");
  const repo = getRepository();
  const report = await mustGetReport(id);
  if (report.status === "resolved" || report.status === "rejected") throw new DomainError("Şikâyet zaten sonuçlandırılmış");
  const profile = await repo.getProfile(report.profileId);
  if (decision === "remove") {
    if (profile && profile.status === "published") await repo.updateProfile(profile.id, { status: "unpublished" });
    if (profile) await repo.updateProfile(profile.id, { moderationStatus: "rejected", moderationNote: note, moderatedBy: actor.id, moderatedAt: new Date().toISOString() });
    await repo.updateReport(id, { status: "resolved", resolution: note });
    await act(actor, report, "content_removed", note);
  } else {
    await repo.updateReport(id, { status: "rejected", resolution: note });
    await act(actor, report, "report_rejected", note);
    const wasAuto = (await repo.listModerationActions({ reportId: id })).some((a) => a.type === "auto_unpublished");
    if (wasAuto && profile && profile.status === "unpublished") {
      // Otomatik kaldırılan profil, açık kritik şikâyet kalmadıysa yeniden yayına alınabilir;
      // yayına alma ön koşul kontrolünden geçer, burada sadece işaretlenir.
      await act(actor, report, "profile_restored", "Şikâyet reddedildi; profil yeniden yayına alınabilir");
    }
  }
}

/** İtiraz (profil sahibi veya şikâyetçi). Kaydı tekrar inceleme kuyruğuna alır. */
export async function recordAppeal(actor: Admin, id: string, note: string) {
  const report = await mustGetReport(id);
  if (report.status !== "resolved" && report.status !== "rejected") throw new DomainError("Yalnızca sonuçlanmış şikâyete itiraz kaydedilebilir");
  await getRepository().updateReport(id, { status: "appealed" });
  await act(actor, report, "appeal_received", note);
}

export async function decideAppeal(actor: Admin, id: string, accepted: boolean, note: string) {
  const report = await mustGetReport(id);
  if (report.status !== "appealed" && report.status !== "in_review") throw new DomainError("Açık bir itiraz yok");
  await getRepository().updateReport(id, { status: accepted ? "resolved" : "rejected", resolution: note });
  await act(actor, report, accepted ? "appeal_accepted" : "appeal_rejected", note);
}
