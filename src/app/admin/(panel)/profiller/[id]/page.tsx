import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleX, ExternalLink } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { ConsentPanel, VerificationPanel } from "@/components/admin/consent-verification";
import { DeleteProfileDialog, ExportButton } from "@/components/admin/data-tools";
import { ImageManager } from "@/components/admin/image-manager";
import { PageHeader } from "@/components/admin/page-header";
import { ProfileForm } from "@/components/admin/profile-form";
import { PROFILE_STATUS_TONE, StatusBadge } from "@/components/admin/status-badge";
import { ViewsChart } from "@/components/admin/views-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canTransition, evaluatePublishReadiness, PROFILE_STATUS_LABELS } from "@/domain/publishing";
import { effectiveStatus, SUBSCRIPTION_STATUS_LABELS } from "@/domain/subscriptions";
import { REPORT_CATEGORY_LABELS } from "@/domain/types";
import { formatDate } from "@/lib/site";
import { requireAdmin } from "@/server/auth/session";
import { getRepository } from "@/server/repositories";
import { loadPublishContext, provinceLabel } from "@/server/services/profiles";
import {
  consentAction,
  deleteProfileAction,
  exportProfileAction,
  imageAction,
  moderateProfileAction,
  profileStatusAction,
  revokeConsentAction,
  updateProfileAction,
  uploadImageAction,
  verificationAction,
} from "../../actions";

const MOD_LABEL = { pending: "Bekliyor", approved: "Onaylandı", rejected: "Reddedildi" } as const;

export default async function ProfileDetailPage({ params }: PageProps<"/admin/profiller/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const repo = getRepository();
  if (!(await repo.getProfile(id))) notFound();
  const ctx = await loadPublishContext(id);
  const { profile, consents, verifications, images, reports } = ctx;
  const readiness = evaluatePublishReadiness(ctx);
  const [interests, subs, plans, audit, views, modActions] = await Promise.all([
    repo.listInterests(),
    repo.listSubscriptions({ profileId: id }),
    repo.listPlans(),
    repo.listAuditLogs({ limit: 50, entityId: id }),
    repo.getDailyViews(30, id),
    repo.listModerationActions({ profileId: id }),
  ]);
  const activeSub = subs.find((s) => effectiveStatus(s, ctx.now) === "active");
  const plan = plans.find((p) => p.id === activeSub?.planId) ?? plans.find((p) => p.code === "basic");
  const dates: Record<string, string> = {};
  for (const c of consents) dates[c.id] = formatDate(c.grantedAt);
  for (const v of verifications) {
    dates[v.id] = formatDate(v.checkedAt ?? v.createdAt);
    if (v.retainUntil) dates[`${v.id}-r`] = formatDate(v.retainUntil);
  }
  const imgActions = Object.fromEntries(
    images.map((img) => [
      img.id,
      {
        confirm: imageAction.bind(null, id, img.id, "confirm"),
        unconfirm: imageAction.bind(null, id, img.id, "unconfirm"),
        remove: imageAction.bind(null, id, img.id, "delete"),
        up: imageAction.bind(null, id, img.id, "up"),
        down: imageAction.bind(null, id, img.id, "down"),
      },
    ]),
  );
  const revoke = Object.fromEntries(consents.map((c) => [c.id, revokeConsentAction.bind(null, id, c.id)]));
  const s = profile.status;

  return (
    <>
      <PageHeader
        title={profile.nickname}
        description={`${provinceLabel(profile)} · /profil/${profile.slug}`}
        actions={
          <>
            <StatusBadge tone={PROFILE_STATUS_TONE[s]} className="self-center">{PROFILE_STATUS_LABELS[s]}</StatusBadge>
            {s === "published" ? (
              <Link href={`/profil/${profile.slug}`} target="_blank" className="inline-flex items-center gap-1 self-center text-sm text-brand hover:underline">
                Sitede gör <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            ) : null}
          </>
        }
      />

      <Tabs defaultValue="yayin" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="yayin">Yayın</TabsTrigger>
          <TabsTrigger value="genel">Genel bilgiler</TabsTrigger>
          <TabsTrigger value="foto">Fotoğraflar ({images.length})</TabsTrigger>
          <TabsTrigger value="riza">Rıza ve doğrulama</TabsTrigger>
          <TabsTrigger value="abonelik">Abonelik</TabsTrigger>
          <TabsTrigger value="gecmis">Geçmiş</TabsTrigger>
          <TabsTrigger value="veri">Veri (KVKK)</TabsTrigger>
        </TabsList>

        <TabsContent value="yayin" className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-xl border border-border/70 bg-card p-5" aria-labelledby="kontrol">
            <h2 id="kontrol" className="mb-1 font-semibold">Yayın ön koşulları</h2>
            <p className="mb-4 text-sm text-muted-foreground">Tüm koşullar sağlanmadan profil yayınlanamaz. Aynı kural veritabanı seviyesinde de uygulanır.</p>
            <ul className="space-y-2" data-testid="publish-checklist">
              {readiness.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm" data-passed={c.passed}>
                  {c.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Sağlandı" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Sağlanmadı" />}
                  <span>{c.label}{c.detail ? <span className="block text-xs text-muted-foreground">{c.detail}</span> : null}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-4 rounded-xl border border-border/70 bg-card p-5" aria-labelledby="islem">
            <h2 id="islem" className="font-semibold">İşlemler</h2>
            <div>
              <p className="mb-2 text-sm">Moderasyon: <StatusBadge tone={profile.moderationStatus === "approved" ? "success" : profile.moderationStatus === "rejected" ? "danger" : "warning"}>{MOD_LABEL[profile.moderationStatus]}</StatusBadge></p>
              {profile.moderationNote ? <p className="mb-2 text-xs text-muted-foreground">Not: {profile.moderationNote}</p> : null}
              <div className="flex flex-wrap gap-2">
                <ActionButton action={moderateProfileAction.bind(null, id, "approved")} variant="outline" size="sm" confirm={{ title: "Moderasyon onaylansın mı?", description: "Biyografi, fotoğraflar ve ilgi alanlarını içerik kurallarına göre incelediğinizi onaylıyorsunuz.", prompt: "Not (isteğe bağlı)", confirmLabel: "Onayla" }}>
                  Moderasyonu onayla
                </ActionButton>
                <ActionButton action={moderateProfileAction.bind(null, id, "rejected")} variant="outline" size="sm" confirm={{ title: "Profil reddedilsin mi?", prompt: "Red gerekçesi", destructive: true, confirmLabel: "Reddet" }}>
                  Reddet
                </ActionButton>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
              {canTransition(s, "published") ? (
                <ActionButton action={profileStatusAction.bind(null, id, "publish")} disabled={!readiness.ready} data-testid="publish-button">Yayınla</ActionButton>
              ) : null}
              {canTransition(s, "in_review") ? <ActionButton action={profileStatusAction.bind(null, id, "review")} variant="outline">İncelemeye gönder</ActionButton> : null}
              {canTransition(s, "unpublished") ? (
                <ActionButton action={profileStatusAction.bind(null, id, "unpublish")} variant="outline" confirm={{ title: "Yayından kaldırılsın mı?", prompt: "Gerekçe", confirmLabel: "Yayından kaldır", destructive: true }}>
                  Yayından kaldır
                </ActionButton>
              ) : null}
              {canTransition(s, "archived") ? (
                <ActionButton action={profileStatusAction.bind(null, id, "archive")} variant="ghost" confirm={{ title: "Profil arşivlensin mi?", description: "Arşivlenen profil yayında görünmez ve düzenlenemez.", confirmLabel: "Arşivle" }}>
                  Arşivle
                </ActionButton>
              ) : null}
              {canTransition(s, "draft") ? <ActionButton action={profileStatusAction.bind(null, id, "draft")} variant="ghost">Taslağa al</ActionButton> : null}
            </div>
            {!readiness.ready && canTransition(s, "published") ? <p className="text-xs text-muted-foreground">Eksik koşullar tamamlandığında yayınlama etkinleşir.</p> : null}
          </section>
        </TabsContent>

        <TabsContent value="genel" className="rounded-xl border border-border/70 bg-card p-5">
          {s === "archived" ? <p className="mb-4 text-sm text-muted-foreground">Arşivlenmiş profil düzenlenemez; önce taslağa alın.</p> : null}
          <ProfileForm
            action={updateProfileAction.bind(null, id)}
            interests={interests}
            submitLabel="Kaydet"
            defaults={{
              nickname: profile.nickname,
              birthDate: profile.birthDate,
              provincePlate: profile.provincePlate,
              districtSlug: profile.districtSlug ?? "",
              bio: profile.bio,
              interestIds: profile.interestIds,
              seoTitle: profile.seoTitle ?? "",
              seoDescription: profile.seoDescription ?? "",
              noindex: profile.noindex,
            }}
          />
        </TabsContent>

        <TabsContent value="foto" className="rounded-xl border border-border/70 bg-card p-5">
          <ImageManager images={images} limit={plan?.maxPhotos ?? 3} upload={uploadImageAction.bind(null, id)} actions={imgActions} />
        </TabsContent>

        <TabsContent value="riza" className="grid gap-8 rounded-xl border border-border/70 bg-card p-5">
          <ConsentPanel consents={consents} add={consentAction.bind(null, id)} revoke={revoke} dates={dates} />
          <VerificationPanel records={verifications} add={verificationAction.bind(null, id)} dates={dates} />
        </TabsContent>

        <TabsContent value="abonelik" className="space-y-4 rounded-xl border border-border/70 bg-card p-5">
          <p className="text-sm">Aktif paket: <strong>{plan?.name ?? "—"}</strong> {activeSub ? `· ${formatDate(activeSub.endsAt)} tarihine kadar` : "(abonelik yok, Basic sınırları geçerli)"}</p>
          <ul className="divide-y divide-border/70 rounded-xl border border-border/70 text-sm">
            {subs.length ? subs.map((x) => (
              <li key={x.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>{plans.find((p) => p.id === x.planId)?.name} · {formatDate(x.startsAt)} – {formatDate(x.endsAt)}{x.sponsored ? " · sponsorlu" : ""}</span>
                <StatusBadge>{SUBSCRIPTION_STATUS_LABELS[effectiveStatus(x, ctx.now)]}</StatusBadge>
              </li>
            )) : <li className="p-3 text-muted-foreground">Abonelik geçmişi yok.</li>}
          </ul>
          <Link href={`/admin/abonelikler?profil=${id}`} className="text-sm text-brand hover:underline">Abonelik yönetimine git →</Link>
          <div className="pt-2"><ViewsChart data={views} label={plan?.advancedStats ? "Görüntülenme (son 30 gün) — Premium istatistik" : "Görüntülenme (son 30 gün)"} /></div>
        </TabsContent>

        <TabsContent value="gecmis" className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="mb-3 font-semibold">Şikâyetler ve moderasyon</h2>
            <ul className="space-y-2 text-sm">
              {reports.map((r) => (
                <li key={r.id}><Link href={`/admin/sikayetler/${r.id}`} className="hover:underline">{REPORT_CATEGORY_LABELS[r.category]}</Link> <span className="text-muted-foreground">· {r.status} · {formatDate(r.createdAt)}</span></li>
              ))}
              {modActions.map((a) => <li key={a.id} className="text-muted-foreground">{a.type} · {formatDate(a.createdAt)}{a.note ? ` · ${a.note}` : ""}</li>)}
              {!reports.length && !modActions.length ? <li className="text-muted-foreground">Kayıt yok.</li> : null}
            </ul>
          </section>
          <section className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="mb-3 font-semibold">Denetim kayıtları</h2>
            <ul className="space-y-1.5 text-sm">
              {audit.length ? audit.map((a) => (
                <li key={a.id} className="flex justify-between gap-2"><code className="text-xs">{a.action}</code><span className="text-xs text-muted-foreground">{formatDate(a.createdAt, { dateStyle: "short", timeStyle: "short" })}</span></li>
              )) : <li className="text-muted-foreground">Kayıt yok.</li>}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="veri" className="space-y-4 rounded-xl border border-border/70 bg-card p-5">
          <p className="text-sm text-muted-foreground">KVKK erişim talepleri için profil verisini dışa aktarın; silme talepleri için profili ve tüm ilişkili belgeleri kalıcı olarak silin.</p>
          <div className="flex flex-wrap gap-2">
            <ExportButton action={exportProfileAction.bind(null, id)} filename={`profil-${profile.slug}.json`} />
            <DeleteProfileDialog slug={profile.slug} action={deleteProfileAction.bind(null, id)} />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
