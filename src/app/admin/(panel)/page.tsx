import Link from "next/link";
import { AlertTriangle, CalendarClock, FileClock, Flag, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ViewsChart } from "@/components/admin/views-chart";
import { isExpiringSoon } from "@/domain/subscriptions";
import { REPORT_CATEGORY_LABELS, CRITICAL_REPORT_CATEGORIES } from "@/domain/types";
import { formatDate, formatNumber } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";

export default async function DashboardPage() {
  await requireAdmin();
  const repo = getRepository();
  const now = new Date();
  const [counts, views, reports, subs, profiles, privacy] = await Promise.all([
    repo.getDashboardCounts(now),
    repo.getDailyViews(14),
    repo.listReports(),
    repo.listSubscriptions(),
    repo.listProfiles(),
    repo.listPrivacyRequests(),
  ]);
  const nameOf = new Map(profiles.map((p) => [p.id, p.nickname]));
  const openReports = reports.filter((r) => ["open", "in_review", "appealed"].includes(r.status)).slice(0, 6);
  const expiring = subs.filter((s) => isExpiringSoon(s, now)).sort((a, b) => a.endsAt.localeCompare(b.endsAt)).slice(0, 6);
  const duePrivacy = privacy.filter((p) => p.status === "received" || p.status === "in_progress").slice(0, 5);

  const kpis = [
    { label: "Toplam profil", value: counts.totalProfiles, href: "/admin/profiller" },
    { label: "Aktif (yayında)", value: counts.published, href: "/admin/profiller?durum=published" },
    { label: "Taslak", value: counts.drafts, href: "/admin/profiller?durum=draft" },
    { label: "İnceleme bekleyen", value: counts.inReview, href: "/admin/profiller?durum=in_review", warn: counts.inReview > 0 },
    { label: "Açık şikâyet", value: counts.openReports, href: "/admin/sikayetler", warn: counts.openReports > 0 },
    { label: "Aktif abonelik", value: counts.activeSubscriptions, href: "/admin/abonelikler" },
    { label: "7 gün içinde bitecek", value: counts.expiringSoon, href: "/admin/abonelikler?filtre=yakinda", warn: counts.expiringSoon > 0 },
    { label: "Açık KVKK talebi", value: counts.openPrivacyRequests, href: "/admin/talepler", warn: counts.openPrivacyRequests > 0 },
  ];

  return (
    <>
      <PageHeader title="Gösterge paneli" description={`Güncel durum · ${formatDate(now.toISOString())}`} />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <li key={k.label}>
            <Link href={k.href} className="block rounded-xl border border-border/70 bg-card p-4 transition-shadow hover:shadow-[var(--shadow-card)]">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${k.warn ? "text-warning" : ""}`}>{formatNumber(k.value)}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border/70 bg-card p-5">
          <ViewsChart data={views} label="Profil görüntülemeleri (son 14 gün)" />
        </section>
        <section className="rounded-xl border border-border/70 bg-card p-5" aria-labelledby="sk">
          <h2 id="sk" className="mb-3 flex items-center gap-2 text-sm font-medium"><Flag className="size-4" aria-hidden /> İşlem bekleyen şikâyetler</h2>
          {openReports.length ? (
            <ul className="divide-y divide-border/70 text-sm">
              {openReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/sikayetler/${r.id}`} className="min-w-0 truncate hover:underline">
                    {nameOf.get(r.profileId) ?? "Silinmiş profil"} · {REPORT_CATEGORY_LABELS[r.category]}
                  </Link>
                  {CRITICAL_REPORT_CATEGORIES.includes(r.category) ? <StatusBadge tone="danger"><AlertTriangle className="mr-1 size-3" aria-hidden />Kritik</StatusBadge> : <StatusBadge>{formatDate(r.createdAt, { day: "numeric", month: "short" })}</StatusBadge>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Bekleyen şikâyet yok.</p>}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border/70 bg-card p-5" aria-labelledby="ab">
          <h2 id="ab" className="mb-3 flex items-center gap-2 text-sm font-medium"><CalendarClock className="size-4" aria-hidden /> Yaklaşan abonelik bitişleri</h2>
          {expiring.length ? (
            <ul className="divide-y divide-border/70 text-sm">
              {expiring.map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <Link href={`/admin/profiller/${s.profileId}`} className="hover:underline">{nameOf.get(s.profileId)}</Link>
                  <span className="text-muted-foreground">{formatDate(s.endsAt, { day: "numeric", month: "short" })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">7 gün içinde bitecek abonelik yok.</p>}
        </section>
        <section className="rounded-xl border border-border/70 bg-card p-5" aria-labelledby="kv">
          <h2 id="kv" className="mb-3 flex items-center gap-2 text-sm font-medium"><FileClock className="size-4" aria-hidden /> KVKK başvuruları (30 gün yasal süre)</h2>
          {duePrivacy.length ? (
            <ul className="divide-y divide-border/70 text-sm">
              {duePrivacy.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <Link href="/admin/talepler" className="hover:underline">{p.requesterName}</Link>
                  <span className="text-muted-foreground">Son gün {formatDate(p.dueAt, { day: "numeric", month: "short" })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="size-4" aria-hidden /> Açık başvuru yok.</p>}
        </section>
      </div>
    </>
  );
}
