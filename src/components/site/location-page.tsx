import Link from "next/link";
import { Suspense } from "react";
import { COUNTRIES, countryName } from "@/domain/countries";
import { parseFilters } from "@/domain/filters";
import { ISTANBUL_SIDES, ISTANBUL_SLUG } from "@/domain/istanbul";
import type { District, Province } from "@/domain/locations";
import { fmt, formatNumberIntl } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { localizedPath } from "@/i18n/routes";
import { isCountryPublishable } from "@/server/queries/country-policy";
import { getLocationDirectory } from "@/server/queries/locations";
import { seoKey } from "@/server/queries/location-seo";
import { getLocationCounts, getLocationSummary, getSeoPage, istanbulSideCounts } from "@/server/queries/public";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { IstanbulSideTabs } from "./istanbul-side-tabs";
import { ProfileListing, ProfileListingSkeleton } from "./profile-listing";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Bölge (il/eyalet) ve yer (ilçe/belediye/kreis) sayfalarının ortak gövdesi. */
export async function LocationPage({ province, district, searchParams }: { province: Province; district?: District; searchParams: SearchParams }) {
  const [{ lang, m }, { listDistricts }] = await Promise.all([getI18n(), getLocationDirectory()]);
  const level = m.places.levels[province.country];
  const regionPath = localizedPath(lang, "location", { country: province.country, region: province.slug });
  const path = district ? localizedPath(lang, "location", { country: province.country, region: province.slug, locality: district.slug }) : regionPath;
  const [summary, seoRow, counts, params, open] = await Promise.all([getLocationSummary(province.slug, district?.slug), getSeoPage(seoKey(province, district)), getLocationCounts(), searchParams, isCountryPublishable(province.country)]);
  const seo = lang === "tr" ? seoRow : null;
  const showSides = open && province.slug === ISTANBUL_SLUG && !district;
  const side = showSides ? parseFilters(params).yaka : undefined;
  const total = side ? istanbulSideCounts(counts)[side] : summary.total;
  const sideDistricts = side ? (ISTANBUL_SIDES[side].districts as readonly string[]) : undefined;
  const listedDistricts = sideDistricts ? summary.districts.filter((d) => sideDistricts.includes(d.slug)) : summary.districts;
  const heading = district ? district.name : side ? m.istanbul[side] : province.name;
  const place = district ? `${district.name}, ${province.name}` : heading;
  const crumbs: Crumb[] = [
    { name: m.nav.cities, href: localizedPath(lang, "cities") },
    { name: countryName(province.country, lang), href: localizedPath(lang, "location", { country: province.country }) },
    { name: province.name, href: regionPath },
    ...(district ? [{ name: district.name, href: path }] : []),
  ];
  const code = COUNTRIES[province.country].showPlate ? String(province.plate).padStart(2, "0") : province.country.toUpperCase();

  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mb-6 mt-6 grid gap-8 border-b border-hairline pb-6 lg:mb-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow text-muted-foreground">
            {district ? fmt(m.places.localityEyebrow, { region: province.name, level: level.locality }) : fmt(m.places.regionEyebrow, { region: province.region, code })}
          </p>
          <h1 className="font-display mt-4 text-display-xl">{heading}</h1>
          {showSides ? (
            <div className="mt-5">
              <IstanbulSideTabs active={side} allHref={path} hrefFor={(s) => `${path}?yaka=${s}`} counts={istanbulSideCounts(counts)} />
            </div>
          ) : null}
          <p className="mt-5 max-w-[56ch] text-lede text-muted-foreground">
            {!open ? fmt(m.places.introNone, { place }) : seo?.intro ?? (total > 0 ? fmt(m.places.introHas, { place, n: total }) : fmt(m.places.introNone, { place }))}
          </p>
        </div>
        <dl className="grid grid-cols-2 border-t border-hairline lg:col-span-4 lg:col-start-9 lg:border-t-0">
          <Stat label={m.places.statProfiles} value={formatNumberIntl(lang, total)} />
          <Stat label={district ? m.places.statPopulation : level.localities} value={district ? formatNumberIntl(lang, district.population) : String(sideDistricts?.length ?? listDistricts(province.plate).length)} />
        </dl>
      </header>

      {open ? (
        <Suspense fallback={<ProfileListingSkeleton />}>
          <LocationResults province={province} district={district} searchParams={searchParams} />
        </Suspense>
      ) : (
        <CountryClosedNotice title={m.places.countryClosedTitle} text={m.places.countryClosedText} />
      )}

      {!district && listedDistricts.length ? (
        <section className="mt-12 grid gap-6 border-t border-hairline pt-10 lg:grid-cols-12" aria-labelledby="ilce-baslik">
          <h2 id="ilce-baslik" className="font-display text-display-md lg:col-span-4">{fmt(m.places.localitiesOf, { place, level: level.localities })}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {listedDistricts.map((d) => (
              <li key={d.slug} className="border-b border-hairline">
                <Link href={localizedPath(lang, "location", { country: province.country, region: province.slug, locality: d.slug })} className="group flex min-h-12 items-baseline justify-between gap-3 py-3 pr-4">
                  <span className="font-display text-lg transition-transform group-hover:translate-x-1">{d.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{fmt(m.common.profiles, { n: d.count })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {district ? (
        <p className="mt-16 border-t border-hairline pt-8">
          <Link href={regionPath} className="font-display text-display-sm underline-offset-[6px] decoration-1 hover:underline">
            {fmt(m.places.allIn, { region: province.name })}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

async function LocationResults({ province, district, searchParams }: { province: Province; district?: District; searchParams: SearchParams }) {
  const raw = parseFilters(await searchParams);
  const filters = { ...raw, ulke: undefined, il: province.slug, ilce: district?.slug };
  return <ProfileListing filters={filters} mode={{ type: "location", country: province.country, il: province.slug }} />;
}

/** Yayın kararı olmayan ülke: profil listesi yerine bilgi notu (sunucuda belirlenir; veritabanı da göstermez). */
export function CountryClosedNotice({ title, text }: { title: string; text: string }) {
  return (
    <section role="status" className="border border-hairline bg-muted/50 p-6 sm:p-8">
      <h2 className="font-display text-display-sm">{title}</h2>
      <p className="mt-3 max-w-[60ch] text-sm text-muted-foreground">{text}</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-hairline py-4 pr-4 [&+&]:border-l [&+&]:pl-4 lg:py-0">
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="font-display mt-2 text-display-sm tabular-nums">{value}</dd>
    </div>
  );
}

export function LocationPageSkeleton() {
  return (
    <div className="container-page pb-8 pt-6 sm:pt-10" aria-busy="true">
      <div className="h-4 w-48 animate-pulse rounded-xs bg-muted" />
      <div className="mb-12 mt-10 h-20 w-2/3 animate-pulse rounded-xs bg-muted" />
      <ProfileListingSkeleton />
    </div>
  );
}
