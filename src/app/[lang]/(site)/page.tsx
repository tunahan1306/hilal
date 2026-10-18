import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { CityPicker } from "@/components/site/city-picker";
import { IstanbulSideTabs } from "@/components/site/istanbul-side-tabs";
import { JsonLd } from "@/components/site/json-ld";
import { ProfileGrid } from "@/components/site/profile-grid";
import { ProfileListing, ProfileListingSkeleton } from "@/components/site/profile-listing";
import { COUNTRY_CODES, countryName, isCountry, type CountryCode } from "@/domain/countries";
import { DEFAULT_ISTANBUL_SIDE, ISTANBUL_SIDES, ISTANBUL_SIDE_KEYS, ISTANBUL_SLUG, isIstanbulSide } from "@/domain/istanbul";
import { POPULAR_PROVINCE_SLUGS } from "@/domain/location-directory";
import { INTL_LOCALE, fmt } from "@/i18n/config";
import { i18nAlternates, i18nOpenGraph } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { SITE, siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getPublishableCountries } from "@/server/queries/country-policy";
import { getLocationDirectory } from "@/server/queries/locations";
import { getFeaturedProfiles, getLocationCounts, istanbulSideCounts, profileCountFor } from "@/server/queries/public";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, m } = await getI18n();
  // ?ulke= ve ?yaka= yalnızca görünümü değiştirir; tek kanonik adres dilin ana sayfasıdır.
  return { title: { absolute: m.home.metaTitle }, description: m.meta.description, alternates: i18nAlternates(lang, "home"), openGraph: i18nOpenGraph(lang, "home", undefined, m.meta.tagline, m.meta.description) };
}

export default function HomePage({ searchParams }: PageProps<"/[lang]">) {
  return (
    <Suspense fallback={<div className="container-page py-10 sm:py-14" aria-busy="true"><div className="mb-10 h-20 w-2/3 animate-pulse rounded-xs bg-muted" /><ProfileListingSkeleton /></div>}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: Pick<PageProps<"/[lang]">, "searchParams">) {
  const [sp, open] = await Promise.all([searchParams, getPublishableCountries()]);
  // Yalnızca yayın kararı olan ülkeler sunulur; kapalı ülke istenirse ilk açık ülkeye düşülür.
  const country: CountryCode = isCountry(sp.ulke) && open.includes(sp.ulke) ? sp.ulke : open.includes("tr") ? "tr" : open[0] ?? "tr";
  const anyOpen = open.length > 0;
  const side = isIstanbulSide(sp.yaka) ? sp.yaka : DEFAULT_ISTANBUL_SIDE;
  const istanbul = anyOpen && country === "tr";
  const [{ lang, m }, { getProvince, listProvinces }, [featuredAll, counts]] = await Promise.all([
    getI18n(),
    getLocationDirectory(),
    Promise.all([getFeaturedProfiles(16), getLocationCounts()]),
  ]);
  const home = localizedPath(lang, "home");
  const homeFor = (c: CountryCode, s?: string) => {
    const q = new URLSearchParams();
    if (c !== "tr") q.set("ulke", c);
    if (s && s !== DEFAULT_ISTANBUL_SIDE) q.set("yaka", s);
    const qs = q.toString();
    return qs ? `${home}?${qs}` : home;
  };
  // Üstteki listede zaten görünen profiller "Öne çıkan" bölümünde tekrarlanmaz.
  const shownSide = new Set<string>(ISTANBUL_SIDES[side].districts);
  const featured = featuredAll
    .filter((p) => (istanbul ? !(p.province.slug === ISTANBUL_SLUG && p.district && shownSide.has(p.district.slug)) : p.province.country !== country))
    .slice(0, 8);
  const cities = listProvinces().map((p) => ({ slug: p.slug, name: p.name, plate: p.plate, country: p.country, count: profileCountFor(counts, p.plate) }));
  const sideCounts = istanbulSideCounts(counts);
  const countryCount = (c: CountryCode) => listProvinces(c).reduce((n, p) => n + profileCountFor(counts, p.plate), 0);
  const popular = [
    ...(istanbul ? ISTANBUL_SIDE_KEYS.map((s) => ({ key: s, name: m.istanbul[s], href: `${localizedPath(lang, "location", { country: "tr", region: ISTANBUL_SLUG })}?yaka=${s}`, count: sideCounts[s] })) : []),
    ...POPULAR_PROVINCE_SLUGS[country]
      .filter((slug) => slug !== ISTANBUL_SLUG)
      .map((slug) => getProvince(slug))
      .filter((p) => p !== undefined)
      .map((p) => ({ key: p.slug, name: p.name, href: localizedPath(lang, "location", { country: p.country, region: p.slug }), count: profileCountFor(counts, p.plate) })),
  ].filter((c) => c.count > 0);
  const heading = istanbul ? m.istanbul[side] : countryName(country, lang);

  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: `${siteUrl()}${home}`, inLanguage: INTL_LOCALE[lang] }} />
    <section className="border-b border-hairline bg-paper">
      <div className="container-page grid gap-7 py-10 sm:py-14 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow text-brand">{m.home.eyebrow}</p>
          {open.length > 1 ? <nav aria-label={m.home.countryTabs} className="mt-4 flex flex-wrap gap-1.5">
            {COUNTRY_CODES.filter((c) => open.includes(c)).map((c) => (
              <Link key={c} href={homeFor(c)} scroll={false} aria-current={c === country ? "page" : undefined}
                className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs uppercase tracking-wide transition-colors", c === country ? "border-foreground text-foreground" : "border-hairline text-muted-foreground hover:text-foreground")}>
                {countryName(c, lang)} <span className="tabular-nums opacity-70">{countryCount(c)}</span>
              </Link>
            ))}
          </nav> : null}
          <h1 className="font-display mt-5 text-display-xl">{heading}</h1>
          {istanbul ? <div className="mt-6"><IstanbulSideTabs active={side} hrefFor={(s) => homeFor("tr", s)} counts={sideCounts} /></div> : null}
        </div>
        <div className="max-w-lg border-l-2 border-brass pl-5 lg:mb-2">
          <h2 className="font-display mb-4 text-display-sm">{m.home.otherCity}</h2>
          <CityPicker cities={cities} />
          <Link href={localizedPath(lang, "explore")} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-brand underline-offset-4 hover:underline">{m.home.exploreAll} <ArrowUpRight className="size-4" aria-hidden /></Link>
        </div>
      </div>
    </section>
    <section className="container-page py-9 sm:py-12" aria-label={fmt(m.home.countryProfiles, { place: heading })}>
      <Suspense fallback={<ProfileListingSkeleton />}>
        {!anyOpen ? (
          <p role="status" className="border border-hairline bg-muted/50 p-6 text-sm text-muted-foreground">{m.home.noCountryOpen}</p>
        ) : istanbul ? (
          <ProfileListing filters={{ il: ISTANBUL_SLUG, yaka: side, ilgi: [], dogrulanmis: false, sayfa: 1 }} mode={{ type: "location", country: "tr", il: ISTANBUL_SLUG }} />
        ) : (
          <ProfileListing filters={{ ulke: country, ilgi: [], dogrulanmis: false, sayfa: 1 }} mode={{ type: "explore" }} />
        )}
      </Suspense>
    </section>
    {featured.length ? <section className="container-page py-9 sm:py-12" aria-labelledby="one-cikanlar">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow text-brand">{m.home.featuredEyebrow}</p><h2 id="one-cikanlar" className="font-display mt-2 text-display-md">{m.home.featuredTitle}</h2></div>
        <p className="text-xs text-muted-foreground">{m.home.sponsoredNote}</p>
      </div>
      <ProfileGrid profiles={featured} priorityCount={0} />
    </section> : null}
    <section className="container-page py-8" aria-labelledby="sehirler">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3"><h2 id="sehirler" className="font-display text-display-md">{m.home.citiesTitle}</h2><Link href={localizedPath(lang, "cities")} className="inline-flex min-h-11 items-center text-sm text-brand">{m.home.allCities}</Link></div>
      {popular.length ? <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {popular.map((p) => <li key={p.key} className="border-t border-hairline"><Link href={p.href} className="flex min-h-16 items-center justify-between gap-3"><span className="font-display text-xl">{p.name}</span><span className="text-xs text-muted-foreground">{fmt(m.common.profilesArrow, { n: p.count })}</span></Link></li>)}
      </ul> : null}
    </section>
    <section className="container-page mt-5 border-t border-hairline py-8" aria-labelledby="guvenlik-baslik">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4"><h2 id="guvenlik-baslik" className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-5 text-brand" aria-hidden /> {m.home.trustTitle}</h2><p className="max-w-2xl text-sm text-muted-foreground">{m.home.trustText}</p><Link href={localizedPath(lang, "safety")} className="inline-flex min-h-11 items-center text-sm text-brand">{m.home.trustLink}</Link></div>
    </section>
  </>;
}
