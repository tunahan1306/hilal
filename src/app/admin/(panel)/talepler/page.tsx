import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { PRIVACY_REQUEST_LABELS } from "@/domain/types";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { privacyStatusAction } from "../actions";

export const metadata: Metadata = { title: "KVKK talepleri" };

const STATUS = { received: "Alındı", in_progress: "İşlemde", completed: "Tamamlandı", rejected: "Reddedildi" } as const;
const TONE = { received: "warning", in_progress: "brand", completed: "success", rejected: "neutral" } as const;
const REL = { self: "Profil sahibi", representative: "Yasal temsilci", other: "Diğer" } as const;

export default async function PrivacyRequestsPage() {
  await requireAdmin();
  const requests = await getRepository().listPrivacyRequests();
  const now = new Date().getTime();
  return (
    <>
      <PageHeader title="KVKK ve kaldırma talepleri" description="KVKK m.13 uyarınca başvurular en geç 30 gün içinde sonuçlandırılmalıdır. Kimlik doğrulaması yapılmadan kişisel veri paylaşılmaz." />
      {requests.length ? (
        <ul className="space-y-3">
          {requests.map((r) => {
            const overdue = (r.status === "received" || r.status === "in_progress") && Date.parse(r.dueAt) < now;
            return (
              <li key={r.id} className="rounded-lg border border-hairline p-5" data-testid="privacy-row">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{PRIVACY_REQUEST_LABELS[r.type]} · {r.requesterName}</p>
                    <p className="text-sm text-muted-foreground">{r.requesterEmail} · {REL[r.relation]} · {formatDate(r.createdAt, { dateStyle: "medium" })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue ? <StatusBadge tone="danger">Süre aşıldı</StatusBadge> : <span className="text-xs text-muted-foreground">Son gün {formatDate(r.dueAt, { dateStyle: "medium" })}</span>}
                    <StatusBadge tone={TONE[r.status]}>{STATUS[r.status]}</StatusBadge>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm">{r.details}</p>
                {r.profileId ? <Link prefetch={false} href={`/admin/profiller/${r.profileId}`} className="mt-2 inline-block text-sm text-brand hover:underline">İlgili profili aç →</Link> : r.profileUrl ? <p className="mt-2 text-sm text-muted-foreground">Bağlantı: {r.profileUrl}</p> : null}
                {r.status === "received" || r.status === "in_progress" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.status === "received" ? <ActionButton action={privacyStatusAction.bind(null, r.id, "in_progress")} size="sm" variant="outline">İşleme al</ActionButton> : null}
                    <ActionButton action={privacyStatusAction.bind(null, r.id, "completed")} size="sm" confirm={{ title: "Talep tamamlandı mı?", description: "Profil kaldırma/silme gibi gerekli işlemleri profil sayfasından yaptığınızı ve başvuru sahibine yanıt verdiğinizi onaylayın." }}>Tamamlandı</ActionButton>
                    <ActionButton action={privacyStatusAction.bind(null, r.id, "rejected")} size="sm" variant="ghost" confirm={{ title: "Talep reddedilsin mi?", description: "Ret gerekçesi başvuru sahibine yazılı olarak bildirilmelidir.", prompt: "Ret gerekçesi (kayda geçer)", destructive: true, minLength: 10 }}>Reddet</ActionButton>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Talep yok.</p>}
    </>
  );
}
