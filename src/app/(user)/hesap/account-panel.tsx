"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { preservingSubmit } from "@/hooks/use-preserving-submit";
import { COUNTRIES, COUNTRY_CODES } from "@/domain/countries";
import type { CreatorAccount, CreatorSubscriptionTier, ContentRights } from "@/domain/creator";
import type { AppUser } from "@/domain/identity";
import type { MediaAsset, Notification, Post, UserProfile } from "@/domain/social";
import { logoutAction, submitAgeVerificationAction, type AuthState } from "../auth/actions";
import { createPostAction, createProfileAction, markNotificationReadAction, updateProfileVisibilityAction, type SocialState } from "../social/actions";
import { applyCreatorAccountAction, createSubscriptionTierAction, recordContentRightsAction, type CreatorState } from "../creator/actions";

export function AccountPanel({
  user,
  ageVerified,
  profile,
  notifications,
  creatorAccount,
  posts,
  mediaAssets,
  contentRights,
  tiers,
}: {
  user: AppUser;
  ageVerified: boolean;
  profile: UserProfile | null;
  notifications: Notification[];
  creatorAccount: CreatorAccount | null;
  posts: Post[];
  mediaAssets: MediaAsset[];
  contentRights: ContentRights[];
  tiers: CreatorSubscriptionTier[];
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(submitAgeVerificationAction, null);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-10 font-sans">
      <h1 className="text-xl font-semibold tracking-tight">Hesabım</h1>
      <dl className="mt-4 grid gap-1 text-sm">
        <div className="flex justify-between gap-4 border-b border-hairline py-2">
          <dt className="text-muted-foreground">E-posta</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-hairline py-2">
          <dt className="text-muted-foreground">E-posta doğrulaması</dt>
          <dd>{user.emailVerifiedAt ? "Doğrulandı" : "Bekliyor"}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-hairline py-2">
          <dt className="text-muted-foreground">Yaş doğrulaması</dt>
          <dd>{ageVerified ? "Doğrulandı" : "Bekliyor"}</dd>
        </div>
      </dl>

      {!ageVerified ? (
        <section className="mt-8 rounded-lg border border-hairline p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" aria-hidden /> Yaş doğrulama
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Yaş doğrulama sağlayıcısı henüz seçilmedi; bu adım şu an hiçbir kullanıcı için tamamlanamaz.
          </p>
          <form action={action} onSubmit={preservingSubmit(action)} className="mt-3 grid gap-3" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="providerSessionRef">Sağlayıcı oturum referansı</Label>
              <Input id="providerSessionRef" name="providerSessionRef" required disabled />
            </div>
            {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
            <Button type="submit" variant="outline" disabled>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Gönder (devre dışı)
            </Button>
          </form>
        </section>
      ) : null}

      <section className="mt-8 rounded-lg border border-hairline p-4">
        <h2 className="text-sm font-medium">Sosyal profil</h2>
        {profile ? <ProfileSummary profile={profile} /> : <CreateProfileForm />}
      </section>

      <section className="mt-8 rounded-lg border border-hairline p-4">
        <h2 className="text-sm font-medium">Gönderiler</h2>
        <PostComposer canPostPaid={creatorAccount?.status === "active"} />
        {posts.length ? (
          <ul className="mt-4 grid gap-2 text-sm">
            {posts.map((p) => (
              <li key={p.id} className="rounded-md bg-muted/50 p-3">
                <p className="whitespace-pre-wrap">{p.body || <span className="italic text-muted-foreground">(yalnızca medya)</span>}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.paid ? "Ücretli" : "Ücretsiz"} · {p.moderationStatus === "approved" ? "Onaylı" : p.moderationStatus === "rejected" ? "Reddedildi" : "İnceleniyor"}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-8 rounded-lg border border-hairline p-4">
        <h2 className="text-sm font-medium">Creator ekonomisi</h2>
        <CreatorSection creatorAccount={creatorAccount} mediaAssets={mediaAssets} contentRights={contentRights} tiers={tiers} />
      </section>

      {notifications.length ? (
        <section className="mt-8 rounded-lg border border-hairline p-4">
          <h2 className="text-sm font-medium">Bildirimler</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 border-b border-hairline pb-2 last:border-b-0">
                <span className={n.readAt ? "text-muted-foreground" : ""}>
                  {n.type === "new_follower"
                    ? "Yeni bir takipçiniz var."
                    : n.type === "moderation_warning"
                      ? `Moderasyon uyarısı${typeof n.payload.note === "string" && n.payload.note ? `: ${n.payload.note}` : "."}`
                      : "Yeni bir mesajınız var."}
                </span>
                {!n.readAt ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">Okundu</Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={logoutAction} className="mt-8">
        <Button type="submit" variant="ghost">
          <LogOut className="size-4" aria-hidden /> Çıkış yap
        </Button>
      </form>
    </main>
  );
}

function CreateProfileForm() {
  const [state, action, pending] = useActionState<SocialState, FormData>(createProfileAction, null);
  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="mt-3 grid gap-3" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="handle">Kullanıcı adı</Label>
        <Input id="handle" name="handle" pattern="[a-z0-9_]{3,30}" required placeholder="kullanici_adi" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="displayName">Görünen ad</Label>
        <Input id="displayName" name="displayName" required maxLength={60} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="birthDate">Doğum tarihi</Label>
        <Input id="birthDate" name="birthDate" type="date" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="countryCode">Ülke</Label>
        <select id="countryCode" name="countryCode" required className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>{COUNTRIES[c].names.tr}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bio">Hakkında</Label>
        <Textarea id="bio" name="bio" maxLength={2000} rows={3} />
      </div>
      {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Profil oluştur
      </Button>
    </form>
  );
}

function ProfileSummary({ profile }: { profile: UserProfile }) {
  const [state, action, pending] = useActionState<SocialState, FormData>(updateProfileVisibilityAction, null);
  return (
    <div className="mt-3 grid gap-3 text-sm">
      <p>
        <Link href={`/kullanici/${profile.handle}`} className="font-medium underline underline-offset-4">@{profile.handle}</Link>{" "}
        <span className="text-muted-foreground">· {profile.displayName}</span>
      </p>
      <p className="text-muted-foreground">
        Moderasyon: {profile.moderationStatus === "approved" ? "Onaylı" : profile.moderationStatus === "rejected" ? "Reddedildi" : "Bekliyor"} · Görünürlük: {profile.visibility}
      </p>
      <form action={action} onSubmit={preservingSubmit(action)} className="flex flex-wrap items-center gap-2" noValidate>
        <select name="visibility" defaultValue={profile.visibility} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="private">Gizli</option>
          <option value="followers_only">Yalnızca takipçiler</option>
          <option value="public">Herkese açık</option>
        </select>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Güncelle
        </Button>
      </form>
      {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
    </div>
  );
}

function CreatorSection({
  creatorAccount,
  mediaAssets,
  contentRights,
  tiers,
}: {
  creatorAccount: CreatorAccount | null;
  mediaAssets: MediaAsset[];
  contentRights: ContentRights[];
  tiers: CreatorSubscriptionTier[];
}) {
  const [state, action, pending] = useActionState<CreatorState, FormData>(applyCreatorAccountAction, null);
  if (!creatorAccount) {
    return (
      <form action={action} onSubmit={preservingSubmit(action)} className="mt-3 grid gap-3" noValidate>
        <p className="text-sm text-muted-foreground">Creator ekonomisine katılmak için başvurun; admin onayından sonra ücretli gönderi ve abonelik planı oluşturabilirsiniz.</p>
        <div className="grid gap-1.5">
          <Label htmlFor="legalName">Yasal ad</Label>
          <Input id="legalName" name="legalName" required maxLength={160} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="creatorCountryCode">Ülke</Label>
          <select id="creatorCountryCode" name="countryCode" required className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>{COUNTRIES[c].names.tr}</option>
            ))}
          </select>
        </div>
        {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Creator başvurusu yap
        </Button>
      </form>
    );
  }
  if (creatorAccount.status === "pending") return <p className="mt-3 text-sm text-muted-foreground">Başvurunuz inceleniyor.</p>;
  if (creatorAccount.status === "suspended") return <p className="mt-3 text-sm text-destructive">Creator hesabınız askıya alındı.</p>;
  return (
    <div className="mt-3 grid gap-6">
      {mediaAssets.length ? (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground">Medya ve hak beyanı</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            {mediaAssets.map((m) => {
              const rights = contentRights.find((r) => r.mediaAssetId === m.id);
              return (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-3">
                  <span className="truncate text-xs text-muted-foreground">{m.storagePath}</span>
                  {rights ? (
                    <span className="text-xs">{rights.reviewedAt ? "İncelendi" : "Beyan edildi — inceleme bekliyor"}</span>
                  ) : (
                    <RightsForm mediaAssetId={m.id} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <TierSection tiers={tiers} />
    </div>
  );
}

function PostComposer({ canPostPaid }: { canPostPaid: boolean }) {
  const [state, action, pending] = useActionState<SocialState, FormData>(createPostAction, null);
  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="mt-3 grid gap-2" noValidate>
      <Label htmlFor="postBody">Yeni gönderi</Label>
      <Textarea id="postBody" name="body" maxLength={4000} rows={3} placeholder="Ne paylaşmak istersiniz?" />
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      {canPostPaid ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="paid" /> Ücretli (yalnızca incelenmiş hak kaydı olan medyayla)
        </label>
      ) : null}
      {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Paylaş
      </Button>
    </form>
  );
}

function RightsForm({ mediaAssetId }: { mediaAssetId: string }) {
  const [state, action, pending] = useActionState<CreatorState, FormData>(recordContentRightsAction, null);
  return (
    <form action={action} onSubmit={preservingSubmit(action)} className="flex items-center gap-2">
      <input type="hidden" name="mediaAssetId" value={mediaAssetId} />
      <select name="rightsType" className="h-8 rounded-md border border-input bg-transparent px-2 text-xs">
        <option value="self_generated">Kendi çekimim</option>
        <option value="licensed">Lisanslı</option>
      </select>
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>Hak beyan et</Button>
      {state ? <span role="alert" className="text-xs text-destructive">{state.message}</span> : null}
    </form>
  );
}

function TierSection({ tiers }: { tiers: CreatorSubscriptionTier[] }) {
  const [state, action, pending] = useActionState<CreatorState, FormData>(createSubscriptionTierAction, null);
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground">Abonelik planları</h3>
      {tiers.length ? (
        <ul className="mt-2 grid gap-1 text-sm">
          {tiers.map((t) => (
            <li key={t.id}>{t.name} — {t.priceAmount} {t.priceCurrency.toUpperCase()}</li>
          ))}
        </ul>
      ) : null}
      <form action={action} onSubmit={preservingSubmit(action)} className="mt-3 grid gap-2" noValidate>
        <Input name="name" placeholder="Plan adı" required maxLength={60} />
        <Input name="priceAmount" type="number" min="0.01" step="0.01" placeholder="Fiyat" required />
        <Input name="priceCurrency" placeholder="try" maxLength={3} defaultValue="try" />
        {state ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="justify-self-start">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Plan oluştur
        </Button>
      </form>
    </div>
  );
}
