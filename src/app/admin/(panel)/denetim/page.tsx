import { PageHeader } from "@/components/admin/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";

export default async function AuditPage() {
  await requireAdmin();
  const logs = await getRepository().listAuditLogs({ limit: 200 });
  return (
    <>
      <PageHeader title="Denetim kayıtları" description="Son 200 işlem. Kayıtlar değiştirilemez (veritabanı tetikleyicisi) ve kişisel veri içermez." />
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Zaman</TableHead><TableHead>İşlem</TableHead><TableHead>Varlık</TableHead><TableHead>Yapan</TableHead><TableHead>Ayrıntı</TableHead></TableRow></TableHeader>
          <TableBody>
            {logs.length ? logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(l.createdAt, { dateStyle: "short", timeStyle: "medium" })}</TableCell>
                <TableCell><code className="text-xs">{l.action}</code></TableCell>
                <TableCell className="text-xs">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 12)}` : ""}</TableCell>
                <TableCell className="text-xs">{l.actorId ? l.actorId.slice(0, 12) : "sistem / ziyaretçi"}</TableCell>
                <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">{JSON.stringify(l.metadata)}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Kayıt yok.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
