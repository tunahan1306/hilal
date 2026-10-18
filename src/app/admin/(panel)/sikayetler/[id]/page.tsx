import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONE, StatusBadge } from "@/components/admin/status-badge";
import { PROFILE_STATUS_LABELS } from "@/domain/publishing";
import { REPORT_CATEGORY_LABELS } from "@/domain/types";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { reportAction } from "../../actions";

export const metadata: Metadata = { title: "Şikâyet ayrıntısı" };

const ACTION_LABELS: Record<string, string> = {
  review_started: "İncelemeye alındı",
  content_removed: "İçerik kaldırıldı",
  profile_unpublished: "Profil yayından kaldırıldı",
  profile_restored: "Profil yeniden yayına alınabilir",
  report_rejected: "Şikâyet reddedildi",
  report_resolved: "Şikâyet sonuçlandı",
  appeal_received: "İtiraz alındı",
  appeal_accepted: "İtiraz kabul edildi",
  appeal_rejected: "İtiraz reddedildi",
  auto_unpublished: "Otomatik yayından kaldırma",
};

export default async function ReportDetailPage({ params }: PageProps<"/admin/sikayetler/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const repo = getRepository();
  const report = await repo.getReport(id);
  if (!report) notFound();
  const [profile, actions] = await Promise.all([repo.getProfile(report.profileId), repo.listModerationActions({ reportId: id })]);
  const open = report.status === "open" || report.status === "in_review";
  const appealed = report.status === "appealed";
  const closed = report.status === "resolved" || report.status === "rejected";
  return (
    <>
      <PageHeader
        title={`Şikâyet: ${REPORT_CATEGORY_LABELS[report.category]}`}
        description={`${formatDate(report.createdAt, { dateStyle: "long", timeStyle: "short" })} · No ${report.id.slice(0, 8)}`}
        actions={<StatusBadge tone={REPORT_STATUS_TONE[report.status]} className="self-center">{REPORT_STATUS_LABELS[report.status]}</StatusBadge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-lg border border-hairline p-5">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Açıklama</h2>
            <p className="mt-1 whitespace-pre-line">{report.description}</p>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Bildiren e-posta:</span> {report.reporterEmail ?? "Belirtilmedi"}
          </div>
          {report.resolution ? <div className="text-sm"><span className="text-muted-foreground">Karar gerekçesi:</span> {report.resolution}</div> : null}
          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
            {report.status === "open" || appealed ? <ActionButton action={reportAction.bind(null, id, "review")} variant="outline">İncelemeye al</ActionButton> : null}
            {open ? (
              <>
                <ActionButton action={reportAction.bind(null, id, "remove")} variant="destructive" confirm={{ title: "İçerik kaldırılsın mı?", description: "Profil yayından kaldırılır ve moderasyon durumu reddedildi olarak işaretlenir.", prompt: "Karar gerekçesi (zorunlu)", destructive: true, confirmLabel: "Kaldır", minLength: 5 }}>
                  İçeriği kaldır
                </ActionButton>
                <ActionButton action={reportAction.bind(null, id, "keep")} variant="outline" confirm={{ title: "Şikâyet reddedilsin mi?", prompt: "Karar gerekçesi", confirmLabel: "Reddet", minLength: 5 }}>
                  Şikâyeti reddet
                </ActionButton>
              </>
            ) : null}
            {closed ? (
              <ActionButton action={reportAction.bind(null, id, "appeal")} variant="outline" confirm={{ title: "İtiraz kaydı", description: "Profil sahibi veya şikâyetçiden gelen itirazı kaydedin.", prompt: "İtiraz özeti", confirmLabel: "Kaydet", minLength: 5 }}>
                İtiraz kaydet
              </ActionButton>
            ) : null}
            {appealed || (report.status === "in_review" && actions.some((a) => a.type === "appeal_received")) ? (
              <>
                <ActionButton action={reportAction.bind(null, id, "appeal-accept")} confirm={{ title: "İtiraz kabul edilsin mi?", prompt: "Gerekçe", confirmLabel: "Kabul et", minLength: 5 }}>İtirazı kabul et</ActionButton>
                <ActionButton action={reportAction.bind(null, id, "appeal-reject")} variant="outline" confirm={{ title: "İtiraz reddedilsin mi?", prompt: "Gerekçe", confirmLabel: "Reddet", minLength: 5 }}>İtirazı reddet</ActionButton>
              </>
            ) : null}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-lg border border-hairline p-5 text-sm">
            <h2 className="mb-2 font-semibold">İlgili profil</h2>
            {profile ? (
              <>
                <Link prefetch={false} href={`/admin/profiller/${profile.id}`} className="font-medium hover:underline">{profile.nickname}</Link>
                <p className="text-muted-foreground">Durum: {PROFILE_STATUS_LABELS[profile.status]}</p>
              </>
            ) : <p className="text-muted-foreground">Profil silinmiş.</p>}
          </section>
          <section className="rounded-lg border border-hairline p-5">
            <h2 className="mb-3 font-semibold">Moderasyon geçmişi</h2>
            <ol className="space-y-3 text-sm" data-testid="moderation-history">
              {actions.length ? actions.map((a) => (
                <li key={a.id} className="border-l-2 border-border pl-3">
                  <p className="font-medium">{ACTION_LABELS[a.type] ?? a.type}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.createdAt, { dateStyle: "medium", timeStyle: "short" })}{a.actorId ? "" : " · sistem"}</p>
                  {a.note ? <p className="mt-1 text-muted-foreground">{a.note}</p> : null}
                </li>
              )) : <li className="text-muted-foreground">Henüz işlem yok.</li>}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
