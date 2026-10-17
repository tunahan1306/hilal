import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";

export const metadata: Metadata = { title: "Denetim kayıtları" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AuditPage({ searchParams }: PageProps<"/admin/denetim">) {
  await requireAdmin();
  const sp = await searchParams;
  const action = (one(sp.islem) ?? "").trim().slice(0, 60);
  const entity = (one(sp.varlik) ?? "").trim().slice(0, 80);
  const all = await getRepository().listAuditLogs({ limit: 500, entityId: entity || undefined });
  const types = [...new Set(all.map((l) => l.entityType))].sort();
  const type = one(sp.tur) ?? "";
  const logs = all.filter((l) => (!action || l.action.includes(action)) && (!type || l.entityType === type)).slice(0, 200);
  return (
    <>
      <PageHeader title="Denetim kayıtları" description="Son işlemler (en fazla 200 gösterilir). Kayıtlar değiştirilemez (veritabanı tetikleyicisi)." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="grid gap-1 text-xs text-muted-foreground">İşlem içerir
          <input name="islem" defaultValue={action} placeholder="ör. profile.publish" className="h-9 w-52 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">Varlık türü
          <select name="tur" defaultValue={type} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="">Tümü</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">Varlık kimliği
          <input name="varlik" defaultValue={entity} className="h-9 w-56 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground" />
        </label>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Filtrele</button>
        {action || entity || type ? <a href="/admin/denetim" className="h-9 content-center text-sm text-muted-foreground hover:text-foreground">Temizle</a> : null}
      </form>
      <p className="mb-2 text-xs text-muted-foreground" role="status">{logs.length} kayıt</p>
      <div className="overflow-x-auto rounded-lg border border-hairline">
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
