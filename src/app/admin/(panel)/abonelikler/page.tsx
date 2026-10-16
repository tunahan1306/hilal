import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canCancel, effectiveStatus, isExpiringSoon, SUBSCRIPTION_STATUS_LABELS } from "@/domain/subscriptions";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { createSubscriptionAction, subscriptionAction } from "../actions";

export const metadata: Metadata = { title: "Abonelikler" };

const TONE = { active: "success", scheduled: "brand", expired: "neutral", cancelled: "danger" } as const;

export default async function SubscriptionsPage({ searchParams }: PageProps<"/admin/abonelikler">) {
  await requireAdmin();
  const repo = getRepository();
  const now = new Date();
  const [subs, plans, profiles, sp] = await Promise.all([repo.listSubscriptions(), repo.listPlans(), repo.listProfiles(), searchParams]);
  const filterSoon = sp.filtre === "yakinda";
  const profileFilter = typeof sp.profil === "string" ? sp.profil : undefined;
  const nameOf = new Map(profiles.map((p) => [p.id, p.nickname]));
  const planOf = new Map(plans.map((p) => [p.id, p]));
  const rows = subs.filter((s) => (!filterSoon || isExpiringSoon(s, now)) && (!profileFilter || s.profileId === profileFilter));

  return (
    <>
      <PageHeader
        title="Abonelikler"
        description="Görünürlük paketleri yalnızca kayıt olarak tutulur. Bu sürümde tahsilat entegrasyonu yoktur; ödeme altyapısı hukuki inceleme ve ödeme kuruluşu onayından sonra eklenecektir."
        actions={filterSoon || profileFilter ? <Link prefetch={false} href="/admin/abonelikler" className="text-sm text-brand hover:underline">Filtreyi kaldır</Link> : <Link prefetch={false} href="/admin/abonelikler?filtre=yakinda" className="text-sm text-brand hover:underline">Yakında bitecekler</Link>}
      />
      <section className="mb-6 rounded-xl border border-border/70 bg-card p-5">
        <h2 className="mb-4 font-semibold">Yeni abonelik kaydı</h2>
        <SubscriptionForm
          action={createSubscriptionAction}
          profiles={profiles.filter((p) => p.status !== "archived").map((p) => ({ id: p.id, name: p.nickname }))}
          plans={plans.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name, sponsoredEligible: p.sponsoredEligible }))}
          defaultProfileId={profileFilter}
          today={now.toISOString().slice(0, 10)}
        />
      </section>
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profil</TableHead><TableHead>Paket</TableHead><TableHead>Başlangıç</TableHead><TableHead>Bitiş</TableHead>
              <TableHead>Durum</TableHead><TableHead>Yenileme</TableHead><TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((s) => {
              const st = effectiveStatus(s, now);
              return (
                <TableRow key={s.id} data-testid="subscription-row">
                  <TableCell><Link prefetch={false} href={`/admin/profiller/${s.profileId}`} className="font-medium hover:underline">{nameOf.get(s.profileId) ?? "—"}</Link></TableCell>
                  <TableCell>{planOf.get(s.planId)?.name}{s.sponsored ? <StatusBadge tone="brand" className="ml-2">Sponsorlu</StatusBadge> : null}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(s.startsAt, { dateStyle: "medium" })}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(s.endsAt, { dateStyle: "medium" })}
                    {isExpiringSoon(s, now) ? <StatusBadge tone="warning" className="ml-2">Yakında</StatusBadge> : null}
                  </TableCell>
                  <TableCell><StatusBadge tone={TONE[st]}>{SUBSCRIPTION_STATUS_LABELS[st]}</StatusBadge></TableCell>
                  <TableCell className="text-muted-foreground">{s.autoRenew ? "Otomatik (kayıt)" : "Manuel"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {st !== "cancelled" ? (
                        <ActionButton action={subscriptionAction.bind(null, s.id, "renew")} size="sm" variant="outline" confirm={{ title: "Abonelik yenilensin mi?", prompt: "Kaç ay? (1–24)", confirmLabel: "Yenile" }}>Yenile</ActionButton>
                      ) : null}
                      {canCancel(s, now) ? (
                        <ActionButton action={subscriptionAction.bind(null, s.id, "cancel")} size="sm" variant="ghost" confirm={{ title: "Abonelik iptal edilsin mi?", prompt: "İptal gerekçesi", destructive: true, confirmLabel: "İptal et" }}>İptal</ActionButton>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Kayıt yok.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
