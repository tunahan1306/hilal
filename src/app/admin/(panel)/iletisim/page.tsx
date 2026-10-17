import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { CONTACT_STATUS_TONE, StatusBadge } from "@/components/admin/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalizeTr } from "@/domain/text";
import {
  CONTACT_CATEGORIES, CONTACT_CATEGORY_LABELS, CONTACT_STATUSES, CONTACT_STATUS_LABELS, type ContactCategory, type ContactStatus,
} from "@/domain/types";
import { formatDate } from "@/lib/site";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { contactNotificationConfig } from "@/server/services/contact";

export const metadata: Metadata = { title: "İletişim talepleri" };

const PAGE_SIZE = 25;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ContactMessagesPage({ searchParams }: PageProps<"/admin/iletisim">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = CONTACT_STATUSES.includes(one(sp.durum) as ContactStatus) ? (one(sp.durum) as ContactStatus) : undefined;
  const category = CONTACT_CATEGORIES.includes(one(sp.kategori) as ContactCategory) ? (one(sp.kategori) as ContactCategory) : undefined;
  const unread = one(sp.okunmamis) === "1";
  const q = (one(sp.q) ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(one(sp.sayfa) ?? "1", 10) || 1);

  const all = await getRepository().listContactMessages({ status, category, unread });
  const needle = normalizeTr(q);
  const filtered = needle ? all.filter((m) => [m.name, m.email, m.subject].some((v) => normalizeTr(v).includes(needle))) : all;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { durum: status, kategori: category, okunmamis: unread ? "1" : undefined, q: q || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return `/admin/iletisim${s ? `?${s}` : ""}`;
  };
  const notify = contactNotificationConfig() !== null;

  return (
    <>
      <PageHeader
        title="İletişim talepleri"
        description="İletişim formundan gelen mesajlar. Gönderen bilgileri kişisel veridir; yalnızca yanıt amacıyla kullanın."
        actions={<StatusBadge tone={notify ? "success" : "neutral"}>{notify ? "E-posta bildirimi açık" : "E-posta bildirimi yapılandırılmamış"}</StatusBadge>}
      />
      <form method="get" action="/admin/iletisim" className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Ara
          <input name="q" defaultValue={q} placeholder="Ad, e-posta veya konu" className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Durum
          <select name="durum" defaultValue={status ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="">Tümü</option>
            {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Kategori
          <select name="kategori" defaultValue={category ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="">Tümü</option>
            {CONTACT_CATEGORIES.map((c) => <option key={c} value={c}>{CONTACT_CATEGORY_LABELS[c]}</option>)}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="okunmamis" value="1" defaultChecked={unread} className="size-4 accent-[var(--brand)]" /> Yalnızca okunmamış
        </label>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Uygula</button>
        {status || category || unread || q ? <Link href="/admin/iletisim" className="h-9 content-center text-sm text-muted-foreground hover:text-foreground">Temizle</Link> : null}
      </form>
      <p className="mb-2 text-xs text-muted-foreground" role="status">{filtered.length} mesaj</p>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <Table>
          <TableHeader>
            <TableRow><TableHead className="w-6"><span className="sr-only">Okunma</span></TableHead><TableHead>Gönderen</TableHead><TableHead>Konu</TableHead><TableHead>Kategori</TableHead><TableHead>Durum</TableHead><TableHead>Tarih</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((m) => (
              <TableRow key={m.id} data-testid="contact-row" className={cn(!m.readAt && "bg-brand-soft/30")}>
                <TableCell>{m.readAt ? <span className="sr-only">Okundu</span> : <span className="block size-2 rounded-full bg-brand" title="Okunmadı"><span className="sr-only">Okunmadı</span></span>}</TableCell>
                <TableCell className={cn(!m.readAt && "font-semibold")}>{m.name}<span className="block text-xs font-normal text-muted-foreground">{m.email}</span></TableCell>
                <TableCell className="max-w-xs"><Link prefetch={false} href={`/admin/iletisim/${m.id}`} className={cn("line-clamp-2 hover:underline", !m.readAt && "font-semibold")}>{m.subject}</Link></TableCell>
                <TableCell className="whitespace-nowrap text-sm">{CONTACT_CATEGORY_LABELS[m.category]}</TableCell>
                <TableCell><StatusBadge tone={CONTACT_STATUS_TONE[m.status]}>{CONTACT_STATUS_LABELS[m.status]}</StatusBadge></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(m.createdAt, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{all.length ? "Filtrelere uyan mesaj yok." : "Henüz mesaj yok."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {pages > 1 ? (
        <nav aria-label="Sayfalama" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href({ sayfa: String(page - 1) })} className="text-brand hover:underline">← Önceki</Link> : <span />}
          <span className="text-muted-foreground">Sayfa {page} / {pages}</span>
          {page < pages ? <Link href={href({ sayfa: String(page + 1) })} className="text-brand hover:underline">Sonraki →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
