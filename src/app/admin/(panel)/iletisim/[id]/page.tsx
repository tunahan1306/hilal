import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { CONTACT_STATUS_TONE, StatusBadge } from "@/components/admin/status-badge";
import { CONTACT_CATEGORY_LABELS, CONTACT_STATUS_LABELS, type ContactStatus } from "@/domain/types";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { openContactMessage } from "@/server/services/contact";
import { contactStatusAction, contactUnreadAction } from "../../actions";

export const metadata: Metadata = { title: "İletişim talebi" };

const ACTION_LABELS: Record<string, string> = {
  "contact_message.create": "Mesaj alındı",
  "contact_message.read": "Okundu",
  "contact_message.unread": "Okunmadı olarak işaretlendi",
  "contact_message.status": "Durum değişti",
};

const TRANSITIONS: { to: ContactStatus; label: string; variant: "default" | "outline" | "ghost"; confirm?: { title: string; description: string; destructive?: boolean } }[] = [
  { to: "in_progress", label: "İşleme al", variant: "outline" },
  { to: "answered", label: "Yanıtlandı", variant: "default", confirm: { title: "Mesaj yanıtlandı mı?", description: "Gönderene e-posta ile yanıt verdiğinizi onaylayın." } },
  { to: "closed", label: "Kapat", variant: "ghost" },
  { to: "spam", label: "Spam", variant: "ghost", confirm: { title: "Spam olarak işaretlensin mi?", description: "Mesaj gelen kutusu sayaçlarından çıkarılır; kayıt silinmez.", destructive: true } },
];

export default async function ContactMessagePage({ params }: PageProps<"/admin/iletisim/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const message = await openContactMessage(admin, id);
  if (!message) notFound();
  const repo = getRepository();
  const logs = await repo.listAuditLogs({ limit: 50, entityId: id });
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((v): v is string => Boolean(v)))];
  const actors = new Map((await Promise.all(actorIds.map((a) => repo.getAdmin(a)))).filter((a) => a !== null).map((a) => [a.id, a.displayName]));

  return (
    <>
      <Link href="/admin/iletisim" prefetch={false} className="mb-3 inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground">← İletişim talepleri</Link>
      <PageHeader
        title={message.subject}
        eyebrow={`${CONTACT_CATEGORY_LABELS[message.category]} · ${formatDate(message.createdAt, { dateStyle: "long", timeStyle: "short" })}`}
        actions={<StatusBadge tone={CONTACT_STATUS_TONE[message.status]}>{CONTACT_STATUS_LABELS[message.status]}</StatusBadge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <article className="rounded-lg border border-hairline p-5">
          <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Gönderen</dt><dd className="font-medium">{message.name}</dd></div>
            <div><dt className="text-xs text-muted-foreground">E-posta</dt><dd className="break-all"><a href={`mailto:${message.email}`} className="text-brand hover:underline">{message.email}</a></dd></div>
          </dl>
          {/* Metin düz yazı olarak işlenir (React kaçışlar); HTML yorumlanmaz. */}
          <p className="whitespace-pre-line break-words border-t border-hairline pt-5 text-sm leading-relaxed">{message.message}</p>
        </article>
        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-hairline p-4" aria-labelledby="islem-baslik">
            <h2 id="islem-baslik" className="mb-3 text-sm font-semibold">İşlemler</h2>
            <div className="flex flex-wrap gap-2">
              {TRANSITIONS.filter((t) => t.to !== message.status).map((t) => (
                <ActionButton key={t.to} action={contactStatusAction.bind(null, message.id, t.to)} size="sm" variant={t.variant} confirm={t.confirm}>{t.label}</ActionButton>
              ))}
              <ActionButton action={contactUnreadAction.bind(null, message.id)} size="sm" variant="ghost">Okunmadı yap</ActionButton>
            </div>
          </section>
          <section className="rounded-lg border border-hairline p-4" aria-labelledby="gecmis-baslik">
            <h2 id="gecmis-baslik" className="mb-3 text-sm font-semibold">İşlem geçmişi</h2>
            <ol className="grid gap-3 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="border-l-2 border-hairline pl-3">
                  <p>
                    {ACTION_LABELS[l.action] ?? l.action}
                    {l.action === "contact_message.status" && typeof l.metadata.to === "string" ? `: ${CONTACT_STATUS_LABELS[l.metadata.to as ContactStatus] ?? l.metadata.to}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(l.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {l.actorId ? (actors.get(l.actorId) ?? "Yönetici") : "Ziyaretçi"}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
