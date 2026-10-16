import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, CircleSlash, Info, MapPin, ShieldAlert, UserX } from "lucide-react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Gallery } from "@/components/site/gallery";
import { JsonLd } from "@/components/site/json-ld";
import { ProfileGrid } from "@/components/site/profile-grid";
import { ReportDialog } from "@/components/site/report-dialog";
import { ViewTracker } from "@/components/site/view-tracker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { truncate } from "@/domain/seo";
import { formatDate, SITE, siteUrl } from "@/lib/site";
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
  const image = profile.images[0];
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
      images: image ? [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] : undefined,
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
    <div className="container-page py-8 sm:py-12" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr] lg:gap-12">
        <Skeleton className="aspect-[4/5] rounded-2xl" />
        <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-24 w-full" /></div>
      </div>
    </div>
  );
}

async function ProfileContent({ params }: Pick<PageProps<"/profil/[slug]">, "params">) {
  const profile = await getPublicProfile((await params).slug);
  if (!profile) notFound();
  const place = profile.district ? `${profile.district.name}, ${profile.province.name}` : profile.province.name;
  const similar = (
    await searchProfiles({ il: profile.province.slug, ilgi: [], dogrulanmis: false, sayfa: 1 })
  ).items.filter((p) => p.id !== profile.id).slice(0, 4);

  return (
    <div className="container-page py-8 sm:py-12">
      <ViewTracker profileId={profile.id} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          dateModified: profile.updatedAt,
          url: `${siteUrl()}/profil/${profile.slug}`,
          mainEntity: {
            "@type": "Person",
            alternateName: profile.nickname,
            description: truncate(profile.bio, 200),
            homeLocation: { "@type": "Place", name: place },
          },
        }}
      />
      <Breadcrumbs
        items={[
          { name: profile.province.name, href: `/sehir/${profile.province.slug}` },
          ...(profile.district ? [{ name: profile.district.name, href: `/sehir/${profile.province.slug}/${profile.district.slug}` }] : []),
          { name: profile.nickname, href: `/profil/${profile.slug}` },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr] lg:gap-12">
        <Gallery images={profile.images} name={profile.nickname} />

        <div className="space-y-8">
          <header className="space-y-3">
            {profile.sponsored ? (
              <span className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sponsorlu profil</span>
            ) : null}
            <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl font-semibold sm:text-4xl">
              {profile.nickname}
              <span className="text-2xl font-normal text-muted-foreground tabular-nums">{profile.age}</span>
            </h1>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4" aria-hidden /> {place}
            </p>
            {profile.verified ? (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-sm text-brand">
                <BadgeCheck className="size-4" aria-hidden /> Kimliği doğrulanmış profil
              </p>
            ) : (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                <CircleSlash className="size-4" aria-hidden /> Kimlik doğrulaması yapılmamış (yaş doğrulaması tamamlandı)
              </p>
            )}
          </header>

          <section aria-labelledby="hakkinda">
            <h2 id="hakkinda" className="mb-2 text-lg font-semibold">Hakkında</h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/90">{profile.bio}</p>
          </section>

          {profile.interests.length ? (
            <section aria-labelledby="ilgi">
              <h2 id="ilgi" className="mb-3 text-lg font-semibold">İlgi alanları</h2>
              <ul className="flex flex-wrap gap-2">
                {profile.interests.map((i) => (
                  <li key={i.slug}>
                    <Link href={`/kesfet?ilgi=${i.slug}`} className="inline-flex min-h-9 items-center rounded-full bg-secondary px-3.5 text-sm hover:bg-accent">
                      {i.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="iletisim" className="rounded-2xl border border-border/70 bg-card p-5">
            <h2 id="iletisim" className="flex items-center gap-2 font-semibold"><Info className="size-4 text-brand" aria-hidden /> İletişim</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Profil sahiplerinin kişisel iletişim bilgileri gizlilik ve güvenlik nedeniyle herkese açık paylaşılmaz. Profillerde telefon, e-posta veya sosyal medya hesabı yer alamaz.
            </p>
          </section>

          <section aria-labelledby="guvenlik" className="rounded-2xl border border-border/70 bg-muted/40 p-5">
            <h2 id="guvenlik" className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4 text-brand" aria-hidden /> Güvenlik bilgilendirmesi</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Hiç kimseye para göndermeyin, ödeme veya &quot;rezervasyon&quot; talep eden kişileri bildirin.</li>
              <li>Ücretli hizmet teklifi, reşit olmadığından şüphelendiğiniz kişi veya izinsiz fotoğraf görürseniz hemen şikâyet edin.</li>
              <li>İlk buluşmaları kalabalık ve herkese açık yerlerde yapın.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Son güncelleme: {formatDate(profile.updatedAt)}</p>
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            <ReportDialog profileId={profile.id} nickname={profile.nickname} />
            <Button asChild variant="ghost" className="w-full">
              <Link href={`/kaldirma-talebi?profil=${profile.slug}`}><UserX className="size-4" aria-hidden /> Profil kaldırma başvurusu</Link>
            </Button>
          </div>
        </div>
      </div>

      {similar.length ? (
        <section className="mt-16" aria-labelledby="benzer">
          <h2 id="benzer" className="mb-5 text-xl font-semibold">{profile.province.name} bölgesindeki diğer profiller</h2>
          <ProfileGrid profiles={similar} />
        </section>
      ) : null}
    </div>
  );
}
