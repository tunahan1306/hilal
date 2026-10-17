import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONE, StatusBadge } from "@/components/admin/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CRITICAL_REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, type ReportStatus } from "@/domain/types";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";

export const metadata: Metadata = { title: "Şikâyetler" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/sikayetler">) {
  await requireAdmin();
  const durum = (await searchParams).durum;
  const filter = typeof durum === "string" && durum in REPORT_STATUS_LABELS ? (durum as ReportStatus) : undefined;
  const repo = getRepository();
  const [reports, profiles] = await Promise.all([repo.listReports(), repo.listProfiles()]);
  const nameOf = new Map(profiles.map((p) => [p.id, p.nickname]));
  const order: ReportStatus[] = ["open", "appealed", "in_review", "resolved", "rejected"];
  const sorted = reports.filter((r) => !filter || r.status === filter).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader title="Şikâyetler" description="Kritik kategorilerde profil otomatik olarak yayından kaldırılır; karar ve itirazlar kayıt altındadır." />
      <nav aria-label="Duruma göre filtrele" className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...order].map((st) => (
          <Link key={st ?? "all"} href={st ? `/admin/sikayetler?durum=${st}` : "/admin/sikayetler"} prefetch={false} aria-current={filter === st ? "page" : undefined}
            className="inline-flex min-h-9 items-center rounded-md border border-hairline px-3 text-sm aria-[current=page]:border-foreground aria-[current=page]:font-medium">
            {st ? REPORT_STATUS_LABELS[st] : "Tümü"} <span className="ml-1.5 tabular-nums text-muted-foreground">{st ? reports.filter((r) => r.status === st).length : reports.length}</span>
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Profil</TableHead><TableHead>Kategori</TableHead><TableHead>Durum</TableHead><TableHead>Tarih</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length ? sorted.map((r) => (
              <TableRow key={r.id} data-testid="report-row">
                <TableCell><Link prefetch={false} href={`/admin/sikayetler/${r.id}`} className="font-medium hover:underline">{nameOf.get(r.profileId) ?? "Silinmiş profil"}</Link></TableCell>
                <TableCell>
                  {REPORT_CATEGORY_LABELS[r.category]}
                  {CRITICAL_REPORT_CATEGORIES.includes(r.category) ? <StatusBadge tone="danger" className="ml-2">Kritik</StatusBadge> : null}
                </TableCell>
                <TableCell><StatusBadge tone={REPORT_STATUS_TONE[r.status]}>{REPORT_STATUS_LABELS[r.status]}</StatusBadge></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.createdAt, { dateStyle: "medium" })}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Şikâyet yok.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
