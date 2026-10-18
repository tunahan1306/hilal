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
import { countryName } from "@/domain/countries";
import { fmt } from "@/i18n/config";
import { i18nAlternates, i18nOpenGraph } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { getLocationDirectory } from "@/server/queries/locations";
import { getPublicProfile, getPublicProfileSlugs, searchProfiles } from "@/server/queries/public";

export async function generateStaticParams() {
  const slugs = await getPublicProfileSlugs();
  return slugs.length ? slugs.slice(0, 200).map(({ slug }) => ({ slug })) : [{ slug: "ornek-profil" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/profile/[slug]">): Promise<Metadata> {
  const { lang, m } = await getI18n();
  const profile = await getPublicProfile((await params).slug);
  if (!profile) return { title: m.profile.notFound, robots: { index: false } };
  const place = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  const title = profile.seo.title ?? `${profile.nickname}, ${profile.age} — ${place}`;
  const description = profile.seo.description ?? truncate(profile.bio);
  return {
    title,
    description,
    alternates: i18nAlternates(lang, "profile", { slug: profile.slug }),
    robots: profile.seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: { ...i18nOpenGraph(lang, "profile", { slug: profile.slug }, title, description), type: "profile", title: `${title} | ${SITE.name}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ProfilePage({ params }: PageProps<"/[lang]/profile/[slug]">) {
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

async function ProfileContent({ params }: Pick<PageProps<"/[lang]/profile/[slug]">, "params">) {
  const [{ lang, m }, profile, { getProvinceByPlate }] = await Promise.all([getI18n(), params.then(({ slug }) => getPublicProfile(slug)), getLocationDirectory()]);
  if (!profile) notFound();
  const country = getProvinceByPlate(profile.province.plate)?.country ?? "tr";
  const regionHref = localizedPath(lang, "location", { country, region: profile.province.slug });
  const profileHref = localizedPath(lang, "profile", { slug: profile.slug });
  const place = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  const whatsapp = whatsAppHref(profile.whatsappPhone);
  const media = mediaOf(profile);
  const cover = profile.images[0];
  const imageCount = profile.images.length;
  const videoCount = profile.videos?.length ?? 0;
  const galleryText = `${fmt(m.profile.photos, { n: imageCount })}${videoCount ? ` · ${fmt(m.profile.videos, { n: videoCount })}` : ""}`;
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
            url: `${siteUrl()}${profileHref}`,
            mainEntity: { "@type": "Person", alternateName: profile.nickname, description: truncate(profile.bio, 200), homeLocation: { "@type": "Place", name: place } },
          }}
        /> : null}
        <Breadcrumbs
          items={[
            { name: countryName(country, lang), href: localizedPath(lang, "location", { country }) },
            { name: profile.province.name, href: regionHref },
            ...(profile.district ? [{ name: profile.district.name, href: localizedPath(lang, "location", { country, region: profile.province.slug, locality: profile.district.slug }) }] : []),
            { name: profile.nickname, href: profileHref },
          ]}
        />

        {/* ——— Hero ——— */}
        <div className="mt-6 grid gap-y-8 sm:mt-8 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            {media.length ? <MediaStrip items={media} name={profile.nickname} /> : null}
            {profile.isExample && !cover ? <div className="flex aspect-[4/5] flex-col items-center justify-center gap-5 bg-muted"><span className="font-display text-9xl text-brand" aria-hidden>{profile.nickname.charAt(0)}</span></div> : null}
            {cover ? (
              <OpenMediaButton index={0} label={m.profile.openCover} className="group relative hidden aspect-[4/5] w-full overflow-hidden rounded-xs bg-muted md:block">
                <Image src={cover.url} alt={cover.alt || fmt(m.profile.coverAlt, { name: profile.nickname })} fill priority sizes="(min-width: 1376px) 760px, (min-width: 1024px) 56vw, 92vw" className="object-cover object-[50%_30%]" />
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xs bg-background/88 px-3 py-1.5 text-xs backdrop-blur transition-opacity group-hover:opacity-100 lg:opacity-0">
                  <Expand className="size-3.5" aria-hidden /> {m.profile.fullscreen}
                </span>
              </OpenMediaButton>
            ) : null}
          </div>

          <header className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
                <AgeBadge label={m.common.adultsOnly} />
                {profile.sponsored ? <span className="text-brand">{m.profile.sponsored}</span> : null}
                <span>{place}</span>
              </p>
              <h1 className="font-display mt-5 flex flex-wrap items-baseline gap-x-4 text-display-xl">
                {profile.nickname}
                <span className="sr-only">, </span>
                <span className="font-sans text-display-sm font-light tabular-nums text-muted-foreground">{profile.age}<span className="sr-only">{m.profile.ageSr}</span></span>
              </h1>
              <div className="mt-5">
                {profile.isExample ? (<p className="border border-hairline bg-muted p-4 text-sm">{m.profile.notVerified}</p>) : profile.verified ? (
                  <VerifiedMark withLabel />
                ) : (
                  <p className="text-sm text-muted-foreground">{m.profile.ageVerifiedOnly}</p>
                )}
              </div>

              <dl className="mt-8 grid grid-cols-2 border-t border-hairline text-sm">
                <Fact label={m.profile.gallery} value={galleryText} />
              </dl>


              <div className="mt-8 flex flex-wrap gap-2 border-t border-hairline pt-6">
                {media.length > 1 ? (
                  <OpenMediaButton index={0} label={fmt(m.profile.openGalleryAria, { n: media.length })} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                    {m.profile.openGallery} <span className="tabular-nums opacity-70">{media.length}</span>
                  </OpenMediaButton>
                ) : null}
                {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer nofollow" aria-label={fmt(m.profile.whatsappAria, { name: profile.nickname })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><MessageCircle className="size-4" aria-hidden /> {m.profile.whatsapp}</a> : null}
                <ReportDialog profileId={profile.id} nickname={profile.nickname} />
              </div>
            </div>
          </header>
        </div>

        {/* ——— Hakkında ——— */}
        <section className="mt-12 grid gap-y-6 border-t border-hairline pt-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-12" aria-labelledby="hakkinda">
          <h2 id="hakkinda" className="eyebrow text-muted-foreground lg:col-span-3">{m.profile.about}</h2>
          <div className="lg:col-span-8 lg:col-start-5">
            <ProfileBio profile={profile} />
            {lang !== "tr" ? <p className="mt-4 text-xs text-muted-foreground">{m.profile.contentLanguage}</p> : null}
          </div>
        </section>

        {/* ——— Galeri ——— */}
        {media.length > 1 ? (
          <section className="mt-12 border-t border-hairline pt-10 lg:mt-16" aria-labelledby="galeri">
            <div className="mb-8 flex items-baseline justify-between gap-4">
              <h2 id="galeri" className="font-display text-display-md">{m.profile.gallery}</h2>
              <p className="text-sm tabular-nums text-muted-foreground">
                {galleryText}
              </p>
            </div>
            <MediaMosaic items={media} name={profile.nickname} />
          </section>
        ) : null}

        {/* ——— Güvenlik ——— */}
        <section className="mt-12 grid gap-y-8 border-t border-hairline pt-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-12" aria-labelledby="guvenlik">
          <h2 id="guvenlik" className="eyebrow flex items-center gap-2 text-muted-foreground lg:col-span-3"><ShieldCheck className="size-3.5" aria-hidden /> {m.profile.safety}</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-8 lg:col-start-5">
            <div>
              <h3 className="font-medium">{m.profile.contactTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {m.profile.contactText}
              </p>
            </div>
            <div>
              <h3 className="font-medium">{m.profile.protectTitle}</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                {m.profile.protect.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:col-span-2">
              <span className="inline-flex items-center gap-2 text-muted-foreground"><Flag className="size-3.5" aria-hidden /> {m.profile.reportsConfidential}</span>
              <Link href={`${localizedPath(lang, "removal")}?profil=${profile.slug}`} className="inline-flex min-h-6 items-center gap-2 underline-offset-4 hover:underline">
                <UserX className="size-3.5" aria-hidden /> {m.profile.removalRequest}
              </Link>
            </div>
          </div>
        </section>

        {similar.length ? (
          <section className="mt-12 border-t border-hairline pt-10 lg:mt-16" aria-labelledby="benzer">
            <h2 id="benzer" className="font-display mb-10 text-display-md">{fmt(m.profile.fromRegion, { region: profile.province.name })}</h2>
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
