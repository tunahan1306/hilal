import { whatsAppHref } from "@/domain/whatsapp";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Expand, Flag, MessageCircle, ShieldCheck, UserX } from "lucide-react";
import { AgeBadge } from "@/components/site/age-badge";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { MediaMosaic } from "@/components/site/profile/media-mosaic";
import { MediaStrip } from "@/components/site/profile/media-strip";
import { OpenMediaButton, ProfileMediaProvider, type MediaItem } from "@/components/site/profile/media-lightbox";
import { ProfileBio } from "@/components/site/profile/profile-bio";
import { ProfileGrid } from "@/components/site/profile-grid";
import { ReportDialog } from "@/components/site/report-dialog";
import { VerifiedMark } from "@/components/site/verified-mark";
import { ViewTracker } from "@/components/site/view-tracker";
import { truncate } from "@/domain/seo";
import type { PublicProfile } from "@/domain/types";
import { SITE, siteUrl } from "@/lib/site";
import { getPublicProfile, getPublicProfileSlugs, searchProfiles } from "@/server/queries/public";

export async function generateStaticParams() {
  const slugs = await getPublicProfileSlugs();
  return slugs.length ? slugs.slice(0, 200).map(({ slug }) => ({ slug })) : [{ slug: "ornek-profil" }];
}

export async function generateMetadata({ params }: PageProps<"/profil/[slug]">): Promise<Metadata> {
  const profile = await getPublicProfile((await params).slug);
  if (!profile) return { title: "Profil bulunamadı", robots: { index: false } };
  const place = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  const title = profile.seo.title ?? `${profile.nickname}, ${profile.age} — ${place}`;
  const description = profile.seo.description ?? truncate(profile.bio);
  return {
    title,
    description,
    alternates: { canonical: `/profil/${profile.slug}` },
    robots: profile.seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "profile",
      title: `${title} | ${SITE.name}`,
      description,
      url: `/profil/${profile.slug}`,

    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ProfilePage({ params }: PageProps<"/profil/[slug]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}

function ProfileSkeleton() {
  return (
    <div className="container-page pt-6 sm:pt-10" aria-busy="true">
      <div className="h-4 w-48 animate-pulse rounded-xs bg-muted" />
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="aspect-[4/5] animate-pulse rounded-xs bg-muted lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5"><div className="h-16 w-2/3 animate-pulse rounded-xs bg-muted" /><div className="h-4 w-1/3 animate-pulse rounded-xs bg-muted" /></div>
      </div>
    </div>
  );
}

function mediaOf(profile: PublicProfile): MediaItem[] {
  return [
    ...profile.images.map((i) => ({ kind: "image" as const, url: i.url, alt: i.alt, width: i.width, height: i.height })),
    ...(profile.videos ?? []).map((v) => ({ kind: "video" as const, url: v.url, poster: v.posterUrl, alt: v.alt, width: v.width, height: v.height, mimeType: v.mimeType })),
  ];
}

async function ProfileContent({ params }: Pick<PageProps<"/profil/[slug]">, "params">) {
  const profile = await getPublicProfile((await params).slug);
  if (!profile) notFound();
  const place = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  const whatsapp = whatsAppHref(profile.whatsappPhone);
  const media = mediaOf(profile);
  const cover = profile.images[0];
  const imageCount = profile.images.length;
  const videoCount = profile.videos?.length ?? 0;
  const similar = (await searchProfiles({ il: profile.province.slug, ilgi: [], dogrulanmis: false, sayfa: 1 })).items
    .filter((p) => p.id !== profile.id)
    .slice(0, 4);

  return (
    <ProfileMediaProvider items={media} name={profile.nickname}>
      <article className="container-page pt-6 sm:pt-10">
        {!profile.isExample ? <ViewTracker profileId={profile.id} /> : null}
        {!profile.isExample ? <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            dateModified: profile.updatedAt,
            url: `${siteUrl()}/profil/${profile.slug}`,
            mainEntity: { "@type": "Person", alternateName: profile.nickname, description: truncate(profile.bio, 200), homeLocation: { "@type": "Place", name: place } },
          }}
        /> : null}
        <Breadcrumbs
          items={[
            { name: profile.province.name, href: `/sehir/${profile.province.slug}` },
            ...(profile.district ? [{ name: profile.district.name, href: `/sehir/${profile.province.slug}/${profile.district.slug}` }] : []),
            { name: profile.nickname, href: `/profil/${profile.slug}` },
          ]}
        />

        {/* ——— Hero ——— */}
        <div className="mt-6 grid gap-y-8 sm:mt-8 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            {media.length ? <MediaStrip items={media} name={profile.nickname} /> : null}
            {profile.isExample && !cover ? <div className="flex aspect-[4/5] flex-col items-center justify-center gap-5 bg-muted"><span className="font-display text-9xl text-brand" aria-hidden>{profile.nickname.charAt(0)}</span></div> : null}
            {cover ? (
              <OpenMediaButton index={0} label="Kapak fotoğrafını tam ekran aç" className="group relative hidden aspect-[4/5] w-full overflow-hidden rounded-xs bg-muted md:block">
                <Image src={cover.url} alt={cover.alt || `${profile.nickname} kapak fotoğrafı`} fill priority sizes="(min-width: 1376px) 760px, (min-width: 1024px) 56vw, 92vw" className="object-cover object-[50%_30%]" />
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xs bg-background/88 px-3 py-1.5 text-xs backdrop-blur transition-opacity group-hover:opacity-100 lg:opacity-0">
                  <Expand className="size-3.5" aria-hidden /> Tam ekran
                </span>
              </OpenMediaButton>
            ) : null}
          </div>

          <header className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
                <AgeBadge />
                {profile.sponsored ? <span className="text-brand">Sponsorlu profil</span> : null}
                <span>{place}</span>
              </p>
              <h1 className="font-display mt-5 flex flex-wrap items-baseline gap-x-4 text-display-xl">
                {profile.nickname}
                <span className="sr-only">, </span>
                <span className="font-sans text-display-sm font-light tabular-nums text-muted-foreground">{profile.age}<span className="sr-only"> yaşında</span></span>
              </h1>
              <div className="mt-5">
                {profile.isExample ? (<p className="border border-hairline bg-muted p-4 text-sm">Kimlik ve yaş doğrulaması yapılmadı.</p>) : profile.verified ? (
                  <VerifiedMark withLabel />
                ) : (
                  <p className="text-sm text-muted-foreground">Yaş belgeyle doğrulandı · kimlik doğrulaması yapılmadı</p>
                )}
              </div>

              <dl className="mt-8 grid grid-cols-2 border-t border-hairline text-sm">
                <Fact label="Galeri" value={`${imageCount} fotoğraf${videoCount ? ` · ${videoCount} video` : ""}`} />
              </dl>


              <div className="mt-8 flex flex-wrap gap-2 border-t border-hairline pt-6">
                {media.length > 1 ? (
                  <OpenMediaButton index={0} label={`Galeriyi aç, ${media.length} öğe`} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                    Galeriyi aç <span className="tabular-nums opacity-70">{media.length}</span>
                  </OpenMediaButton>
                ) : null}
                {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${profile.nickname} ile WhatsApp üzerinden iletişim kur (yeni sekme)`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><MessageCircle className="size-4" aria-hidden /> WhatsApp ile iletişim</a> : null}
                <ReportDialog profileId={profile.id} nickname={profile.nickname} />
              </div>
            </div>
          </header>
        </div>

        {/* ——— Hakkında ——— */}
        <section className="mt-12 grid gap-y-6 border-t border-hairline pt-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-12" aria-labelledby="hakkinda">
          <h2 id="hakkinda" className="eyebrow text-muted-foreground lg:col-span-3">Hakkında</h2>
          <div className="lg:col-span-8 lg:col-start-5">
            <ProfileBio profile={profile} />
          </div>
        </section>

        {/* ——— Galeri ——— */}
        {media.length > 1 ? (
          <section className="mt-12 border-t border-hairline pt-10 lg:mt-16" aria-labelledby="galeri">
            <div className="mb-8 flex items-baseline justify-between gap-4">
              <h2 id="galeri" className="font-display text-display-md">Galeri</h2>
              <p className="text-sm tabular-nums text-muted-foreground">
                {imageCount} fotoğraf{videoCount ? ` · ${videoCount} video` : ""}
              </p>
            </div>
            <MediaMosaic items={media} name={profile.nickname} />
          </section>
        ) : null}

        {/* ——— Güvenlik ——— */}
        <section className="mt-12 grid gap-y-8 border-t border-hairline pt-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-12" aria-labelledby="guvenlik">
          <h2 id="guvenlik" className="eyebrow flex items-center gap-2 text-muted-foreground lg:col-span-3"><ShieldCheck className="size-3.5" aria-hidden /> Güvenlik</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-8 lg:col-start-5">
            <div>
              <h3 className="font-medium">İletişim</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                WhatsApp butonu yalnızca profil sahibinin açık paylaşım izni varsa görünür. Diğer kişisel iletişim bilgileri yayınlanmaz.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Kendinizi koruyun</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                <li>Kimseye para veya ön ödeme göndermeyin.</li>
                <li>Ücretli hizmet teklifi, reşit olmadığından şüphelendiğiniz biri veya izinsiz fotoğraf görürseniz bildirin.</li>
                <li>İlk buluşmaları kalabalık, herkese açık yerlerde yapın.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:col-span-2">
              <span className="inline-flex items-center gap-2 text-muted-foreground"><Flag className="size-3.5" aria-hidden /> Bildirimler gizli tutulur.</span>
              <Link href={`/kaldirma-talebi?profil=${profile.slug}`} className="inline-flex min-h-6 items-center gap-2 underline-offset-4 hover:underline">
                <UserX className="size-3.5" aria-hidden /> Profil kaldırma başvurusu
              </Link>
            </div>
          </div>
        </section>

        {similar.length ? (
          <section className="mt-12 border-t border-hairline pt-10 lg:mt-16" aria-labelledby="benzer">
            <h2 id="benzer" className="font-display mb-10 text-display-md">{profile.province.name} bölgesinden</h2>
            <ProfileGrid profiles={similar} />
          </section>
        ) : null}
      </article>
    </ProfileMediaProvider>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-hairline py-3 pr-3 odd:border-r odd:pr-4 even:pl-4">
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
