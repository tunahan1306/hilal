import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ViewsChart } from "@/components/admin/views-chart";
import { isExpiringSoon } from "@/domain/subscriptions";
import { CRITICAL_REPORT_CATEGORIES, PRIVACY_REQUEST_LABELS, REPORT_CATEGORY_LABELS } from "@/domain/types";
import { formatDate, formatNumber } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";

export const metadata: Metadata = { title: "Gösterge paneli" };

type QueueItem = { key: string; priority: number; kind: string; title: string; detail: string; href: string; tone: "danger" | "warning" | "brand" | "neutral"; at: string };

export default async function DashboardPage() {
  await requireAdmin();
  const repo = getRepository();
  const now = new Date();
  const [counts, views, reports, subs, profiles, privacy] = await Promise.all([
    repo.getDashboardCounts(now),
    repo.getDailyViews(30),
    repo.listReports(),
    repo.listSubscriptions(),
    repo.listProfiles(),
    repo.listPrivacyRequests(),
  ]);
  const nameOf = new Map(profiles.map((p) => [p.id, p.nickname]));
  const expiring = subs.filter((s) => isExpiringSoon(s, now)).sort((a, b) => a.endsAt.localeCompare(b.endsAt)).slice(0, 6);

  const queue: QueueItem[] = [
    ...reports
      .filter((r) => ["open", "in_review", "appealed"].includes(r.status))
      .map((r) => {
        const critical = CRITICAL_REPORT_CATEGORIES.includes(r.category);
        return {
          key: r.id, priority: critical ? 0 : 2, kind: critical ? "Kritik şikâyet" : "Şikâyet",
          title: nameOf.get(r.profileId) ?? "Silinmiş profil", detail: REPORT_CATEGORY_LABELS[r.category],
          href: `/admin/sikayetler/${r.id}`, tone: critical ? "danger" : "warning", at: r.createdAt,
        } satisfies QueueItem;
      }),
    ...privacy
      .filter((p) => p.status === "received" || p.status === "in_progress")
      .map((p) => ({
        key: p.id, priority: 1, kind: "KVKK", title: p.requesterName, detail: `${PRIVACY_REQUEST_LABELS[p.type]} · son gün ${formatDate(p.dueAt, { day: "numeric", month: "short" })}`,
        href: "/admin/talepler", tone: "brand", at: p.createdAt,
      }) satisfies QueueItem),
    ...profiles
      .filter((p) => p.status === "in_review")
      .map((p) => ({ key: p.id, priority: 3, kind: "İnceleme", title: p.nickname, detail: "Moderasyon bekliyor", href: `/admin/profiller/${p.id}`, tone: "neutral", at: p.updatedAt }) satisfies QueueItem),
  ].sort((a, b) => a.priority - b.priority || b.at.localeCompare(a.at));

  const kpis = [
    { label: "Yayında", value: counts.published, sub: `${counts.totalProfiles} profilden`, href: "/admin/profiller?durum=published" },
    { label: "İnceleme bekleyen", value: counts.inReview, href: "/admin/profiller?durum=in_review", warn: counts.inReview > 0 },
    { label: "Taslak", value: counts.drafts, href: "/admin/profiller?durum=draft" },
    { label: "Açık şikâyet", value: counts.openReports, href: "/admin/sikayetler", warn: counts.openReports > 0 },
    { label: "KVKK talebi", value: counts.openPrivacyRequests, href: "/admin/talepler", warn: counts.openPrivacyRequests > 0 },
    { label: "Okunmamış mesaj", value: counts.unreadContactMessages, href: "/admin/iletisim?okunmamis=1", warn: counts.unreadContactMessages > 0 },
    { label: "Aktif abonelik", value: counts.activeSubscriptions, sub: `${counts.expiringSoon} tanesi 7 gün içinde bitiyor`, href: "/admin/abonelikler" },
  ];

  return (
    <>
      <PageHeader title="Gösterge paneli" eyebrow={formatDate(now.toISOString(), { weekday: "long", day: "numeric", month: "long" })} />
      <ul aria-label="Özet göstergeler" className="grid grid-cols-2 overflow-hidden rounded-lg border border-hairline sm:grid-cols-3 xl:grid-cols-7">
        {kpis.map((k) => (
          <li key={k.label} className="border-b border-r border-hairline [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r xl:last:border-r-0"><Link href={k.href} prefetch={false} className="group block h-full p-4 transition-colors hover:bg-secondary/60">
            <span className="block text-xs text-muted-foreground">{k.label}</span>
            <span className={`mt-1.5 block text-2xl font-semibold tabular-nums tracking-tight ${k.warn ? "text-warning" : ""}`}>{formatNumber(k.value)}</span>
            {k.sub ? <span className="mt-0.5 block text-xs text-muted-foreground sm:truncate">{k.sub}</span> : null}
          </Link></li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="self-start rounded-lg border border-hairline" aria-labelledby="kuyruk">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <h2 id="kuyruk" className="text-sm font-medium">İşlem kuyruğu</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{queue.length} öğe · önceliğe göre</span>
          </div>
          {queue.length ? (
            <ul className="divide-y divide-hairline">
              {queue.slice(0, 10).map((q) => (
                <li key={q.key}>
                  <Link href={q.href} prefetch={false} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 px-4 py-2.5 text-[0.8125rem] transition-colors hover:bg-secondary/60">
                    <StatusBadge tone={q.tone}>{q.kind}</StatusBadge>
                    <span className="min-w-0 truncate"><span className="font-medium">{q.title}</span> <span className="text-muted-foreground">· {q.detail}</span></span>
                    <span className="text-xs tabular-nums text-muted-foreground">{formatDate(q.at, { day: "numeric", month: "short" })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Bekleyen işlem yok.</p>
          )}
        </section>

        <div className="grid gap-6">
          <section className="rounded-lg border border-hairline p-4">
            <ViewsChart data={views} label="Profil görüntülemeleri · 30 gün" />
          </section>
          <section className="rounded-lg border border-hairline" aria-labelledby="bitis">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <h2 id="bitis" className="text-sm font-medium">Yaklaşan abonelik bitişleri</h2>
              <Link href="/admin/abonelikler?filtre=yakinda" prefetch={false} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Tümü <ArrowUpRight className="size-3" aria-hidden /></Link>
            </div>
            {expiring.length ? (
              <ul className="divide-y divide-hairline text-[0.8125rem]">
                {expiring.map((s) => (
                  <li key={s.id} className="flex justify-between px-4 py-2.5">
                    <Link href={`/admin/profiller/${s.profileId}`} prefetch={false} className="hover:underline">{nameOf.get(s.profileId)}</Link>
                    <span className="tabular-nums text-muted-foreground">{formatDate(s.endsAt, { day: "numeric", month: "short" })}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 py-6 text-sm text-muted-foreground">7 gün içinde bitecek abonelik yok.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
