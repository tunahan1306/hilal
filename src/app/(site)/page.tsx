import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { CityPicker } from "@/components/site/city-picker";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { ProfileGrid } from "@/components/site/profile-grid";
import { POPULAR_PROVINCE_SLUGS } from "@/domain/location-directory";
import { getLocationDirectory } from "@/server/queries/locations";
import { SITE, siteUrl } from "@/lib/site";
import { getFeaturedProfiles, getLocationCounts, profileCountFor } from "@/server/queries/public";

export default async function HomePage() {
  const { getProvince, listProvinces } = await getLocationDirectory();
  const [featured, counts] = await Promise.all([getFeaturedProfiles(8), getLocationCounts()]);
  const cities = listProvinces().map((p) => ({ slug: p.slug, name: p.name, plate: p.plate, count: profileCountFor(counts, p.plate) }));
  const popular = POPULAR_PROVINCE_SLUGS.map((slug) => getProvince(slug)!);
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: siteUrl(), inLanguage: "tr-TR" }} />
    <section className="border-b border-hairline bg-paper">
      <div className="container-page grid gap-7 py-10 sm:py-14 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow text-brand">Sosyal keşif · 81 il · 973 ilçe · 18+</p>
          <h1 className="font-display mt-5 max-w-[13ch] text-display-xl">Şehrin içinde.<br /><em className="text-brand">Yeni bir hikâye.</em></h1>
          <p className="mt-5 max-w-[48ch] text-lede text-muted-foreground">Yetişkinlerin açık rızayla yayınlanan sosyal profillerini şehrinizde keşfedin.</p>
        </div>
        <div className="max-w-lg border-l-2 border-brass pl-5 lg:mb-2">
          <h2 className="font-display mb-4 text-display-sm">Keşif nerede başlasın?</h2>
          <CityPicker cities={cities} />
          <Link href="/kesfet" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-brand underline-offset-4 hover:underline">Profilleri keşfet <ArrowUpRight className="size-4" aria-hidden /></Link>
        </div>
      </div>
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
        {popular.map((p) => <li key={p.slug} className="border-t border-hairline"><Link href={`/sehir/${p.slug}`} className="flex min-h-16 items-center justify-between gap-3"><span className="font-display text-xl">{p.name}</span><span className="text-xs text-muted-foreground">{profileCountFor(counts, p.plate)} profil ↗</span></Link></li>)}
      </ul>
    </section>
    <section className="container-page mt-5 border-t border-hairline py-8" aria-labelledby="guvenlik-baslik">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4"><h2 id="guvenlik-baslik" className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-5 text-brand" aria-hidden /> Rıza, mahremiyet, güven.</h2><p className="max-w-2xl text-sm text-muted-foreground">Yayın öncesi yaş ve rıza kontrolü yapılır. Yalnızca sahibinin paylaşım izni verdiği WhatsApp iletişimi gösterilir. Ücretli cinsel hizmet tanıtımı ve yönlendirme yasaktır.</p><Link href="/guvenlik" className="inline-flex min-h-11 items-center text-sm text-brand">Güvenlik ilkeleri →</Link></div>
    </section>
  </>;
}
