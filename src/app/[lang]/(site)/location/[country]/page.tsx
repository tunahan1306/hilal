import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { COUNTRIES, COUNTRY_CODES, countryName, isCountry } from "@/domain/countries";
import { fmt } from "@/i18n/config";
import { i18nPageMeta } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { CountryClosedNotice } from "@/components/site/location-page";
import { isCountryPublishable } from "@/server/queries/country-policy";
import { getLocationDirectory } from "@/server/queries/locations";
import { getLocationCounts, profileCountFor } from "@/server/queries/public";

export function generateStaticParams() {
  return COUNTRY_CODES.map((country) => ({ country }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/location/[country]">): Promise<Metadata> {
  const { country } = await params;
  if (!isCountry(country)) return {};
  const { lang, m } = await getI18n();
  const name = countryName(country, lang);
  const meta = i18nPageMeta(lang, "location", { country }, fmt(m.places.metaTitle, { place: name }), fmt(m.places.metaDescription, { place: name }));
  // Yayına açık olmayan pazarın dizini indekslenmez.
  return (await isCountryPublishable(country)) ? meta : { ...meta, robots: { index: false, follow: true } };
}

/** Ülke dizini: bölgeler (il/eyalet) ve profil sayıları. */
export default async function CountryPage({ params }: PageProps<"/[lang]/location/[country]">) {
  const { country } = await params;
  if (!isCountry(country)) notFound();
  const [{ lang, m }, { listProvinces }, counts, open] = await Promise.all([getI18n(), getLocationDirectory(), getLocationCounts(), isCountryPublishable(country)]);
  const provinces = listProvinces(country);
  const level = m.places.levels[country];
  const byRegion = new Map<string, typeof provinces>();
  for (const p of provinces) byRegion.set(p.region, [...(byRegion.get(p.region) ?? []), p]);
  const groups = [...byRegion.entries()].sort((a, b) => a[0].localeCompare(b[0], lang));
  const name = countryName(country, lang);
  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ name: m.nav.cities, href: localizedPath(lang, "cities") }, { name, href: localizedPath(lang, "location", { country }) }]} />
      <header className="mb-12 mt-8 border-b border-hairline pb-10">
        <p className="eyebrow text-muted-foreground">{fmt(m.places.countryIndex, { country: name, n: provinces.length })}</p>
        <h1 className="font-display mt-4 text-display-xl">{name}</h1>
        <p className="mt-4 text-lede text-muted-foreground">{level.regions}</p>
      </header>
      {open ? null : <div className="mb-12"><CountryClosedNotice title={m.places.countryClosedTitle} text={m.places.countryClosedText} /></div>}
      <div className="grid gap-x-12 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([region, list]) => (
          <section key={region} aria-labelledby={`r-${region}`}>
            {groups.length > 1 ? <h2 id={`r-${region}`} className="font-display mb-4 text-display-sm">{region}</h2> : <h2 id={`r-${region}`} className="sr-only">{level.regions}</h2>}
            <ul className="border-t border-foreground/80">
              {list.map((p) => {
                const n = profileCountFor(counts, p.plate);
                return (
                  <li key={p.slug} className="border-b border-hairline">
                    <Link href={localizedPath(lang, "location", { country, region: p.slug })} className="group grid min-h-11 grid-cols-[2rem_1fr_auto] items-center gap-2 py-2 text-[0.9375rem]">
                      <span className="text-xs tabular-nums text-muted-foreground">{COUNTRIES[country].showPlate ? String(p.plate).padStart(2, "0") : ""}</span>
                      <span className={n ? "transition-transform group-hover:translate-x-1" : "text-muted-foreground transition-transform group-hover:translate-x-1"}>{p.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{n ? fmt(m.common.profiles, { n }) : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
