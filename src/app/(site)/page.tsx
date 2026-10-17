import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { CityPicker } from "@/components/site/city-picker";
import { EmptyState } from "@/components/site/empty-state";
import { IstanbulSideTabs } from "@/components/site/istanbul-side-tabs";
import { JsonLd } from "@/components/site/json-ld";
import { ProfileGrid } from "@/components/site/profile-grid";
import { ProfileListing, ProfileListingSkeleton } from "@/components/site/profile-listing";
import { DEFAULT_ISTANBUL_SIDE, ISTANBUL_SIDES, ISTANBUL_SIDE_KEYS, ISTANBUL_SLUG, isIstanbulSide } from "@/domain/istanbul";
import { POPULAR_PROVINCE_SLUGS } from "@/domain/location-directory";
import { getLocationDirectory } from "@/server/queries/locations";
import { SITE, siteUrl } from "@/lib/site";
import { getFeaturedProfiles, getLocationCounts, istanbulSideCounts, profileCountFor } from "@/server/queries/public";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="container-page py-10 sm:py-14" aria-busy="true"><div className="mb-10 h-20 w-2/3 animate-pulse rounded-xs bg-muted" /><ProfileListingSkeleton /></div>}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const yaka = (await searchParams).yaka;
  const side = isIstanbulSide(yaka) ? yaka : DEFAULT_ISTANBUL_SIDE;
  const { getProvince, listProvinces } = await getLocationDirectory();
  const [featured, counts] = await Promise.all([getFeaturedProfiles(8), getLocationCounts()]);
  const cities = listProvinces().map((p) => ({ slug: p.slug, name: p.name, plate: p.plate, count: profileCountFor(counts, p.plate) }));
  const sideCounts = istanbulSideCounts(counts);
  const popular = [
    ...ISTANBUL_SIDE_KEYS.map((s) => ({ key: s, name: ISTANBUL_SIDES[s].name, href: `/sehir/istanbul?yaka=${s}`, count: sideCounts[s] })),
    ...POPULAR_PROVINCE_SLUGS.filter((slug) => slug !== ISTANBUL_SLUG).map((slug) => getProvince(slug)!).map((p) => ({ key: p.slug, name: p.name, href: `/sehir/${p.slug}`, count: profileCountFor(counts, p.plate) })),
  ];
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: siteUrl(), inLanguage: "tr-TR" }} />
    <section className="border-b border-hairline bg-paper">
      <div className="container-page grid gap-7 py-10 sm:py-14 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow text-brand">Sosyal keşif · 18+</p>
          <h1 className="font-display mt-5 text-display-xl">{ISTANBUL_SIDES[side].name}</h1>
          <div className="mt-6"><IstanbulSideTabs active={side} hrefFor={(s) => (s === DEFAULT_ISTANBUL_SIDE ? "/" : `/?yaka=${s}`)} counts={sideCounts} /></div>
        </div>
        <div className="max-w-lg border-l-2 border-brass pl-5 lg:mb-2">
          <h2 className="font-display mb-4 text-display-sm">Başka bir şehir mi?</h2>
          <CityPicker cities={cities} />
          <Link href="/kesfet" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-brand underline-offset-4 hover:underline">Tüm profilleri keşfet <ArrowUpRight className="size-4" aria-hidden /></Link>
        </div>
      </div>
    </section>
    <section className="container-page py-9 sm:py-12" aria-label={`${ISTANBUL_SIDES[side].name} profilleri`}>
      <Suspense fallback={<ProfileListingSkeleton />}>
        <ProfileListing filters={{ il: ISTANBUL_SLUG, yaka: side, ilgi: [], dogrulanmis: false, sayfa: 1 }} mode={{ type: "location", il: ISTANBUL_SLUG }} />
      </Suspense>
    </section>
    <section className="container-page py-9 sm:py-12" aria-labelledby="one-cikanlar">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow text-brand">Seçkimiz</p><h2 id="one-cikanlar" className="font-display mt-2 text-display-md">Öne çıkan profiller</h2></div>
        <p className="text-xs text-muted-foreground">Sponsorlu profiller açıkça etiketlenir.</p>
      </div>
      {featured.length ? <ProfileGrid profiles={featured} priorityCount={2} /> : <EmptyState title="Henüz yayında profil yok" description="Profiller rıza, yaş doğrulaması ve moderasyon tamamlandıktan sonra yayınlanır." />}
    </section>
    <section className="container-page py-8" aria-labelledby="sehirler">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3"><h2 id="sehirler" className="font-display text-display-md">Şehir şehir keşfet</h2><Link href="/sehirler" className="inline-flex min-h-11 items-center text-sm text-brand">81 ilin tamamı →</Link></div>
      <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {popular.map((p) => <li key={p.key} className="border-t border-hairline"><Link href={p.href} className="flex min-h-16 items-center justify-between gap-3"><span className="font-display text-xl">{p.name}</span><span className="text-xs text-muted-foreground">{p.count} profil ↗</span></Link></li>)}
      </ul>
    </section>
    <section className="container-page mt-5 border-t border-hairline py-8" aria-labelledby="guvenlik-baslik">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4"><h2 id="guvenlik-baslik" className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-5 text-brand" aria-hidden /> Rıza, mahremiyet, güven.</h2><p className="max-w-2xl text-sm text-muted-foreground">Yayın öncesi yaş ve rıza kontrolü yapılır. Yalnızca sahibinin paylaşım izni verdiği WhatsApp iletişimi gösterilir. Ücretli cinsel hizmet tanıtımı ve yönlendirme yasaktır.</p><Link href="/guvenlik" className="inline-flex min-h-11 items-center text-sm text-brand">Güvenlik ilkeleri →</Link></div>
    </section>
  </>;
}
