import { getLocationDirectory } from "@/server/queries/locations";
import Link from "next/link";
import { Suspense } from "react";
import { parseFilters } from "@/domain/filters";
import type { District, Province } from "@/domain/locations";
import { formatNumber } from "@/lib/site";
import { getLocationCounts, getLocationSummary, getSeoPage, istanbulSideCounts } from "@/server/queries/public";
import { ISTANBUL_SIDES, ISTANBUL_SLUG } from "@/domain/istanbul";
import { IstanbulSideTabs } from "./istanbul-side-tabs";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { ProfileListing, ProfileListingSkeleton } from "./profile-listing";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** İl ve ilçe sayfalarının ortak gövdesi. */
export async function LocationPage({
  province,
  district,
  searchParams,
}: {
  province: Province;
  district?: District;
  searchParams: SearchParams;
}) {
  const { listDistricts } = await getLocationDirectory();
  const path = district ? `/sehir/${province.slug}/${district.slug}` : `/sehir/${province.slug}`;
  const [summary, seo, counts, params] = await Promise.all([getLocationSummary(province.slug, district?.slug), getSeoPage(path), getLocationCounts(), searchParams]);
  const showSides = province.slug === ISTANBUL_SLUG && !district;
  const side = showSides ? parseFilters(params).yaka : undefined;
  const total = side ? istanbulSideCounts(counts)[side] : summary.total;
  const sideDistricts = side ? (ISTANBUL_SIDES[side].districts as readonly string[]) : undefined;
  const listedDistricts = sideDistricts ? summary.districts.filter((d) => sideDistricts.includes(d.slug)) : summary.districts;
  const place = district ? `${district.name}, ${province.name}` : side ? ISTANBUL_SIDES[side].name : province.name;
  const crumbs: Crumb[] = [
    { name: "Şehirler", href: "/sehirler" },
    { name: province.name, href: `/sehir/${province.slug}` },
    ...(district ? [{ name: district.name, href: path }] : []),
  ];

  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mb-6 mt-6 grid gap-8 border-b border-hairline pb-6 lg:mb-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow text-muted-foreground">
            {district ? `${province.name} · ilçe` : `${province.region} Bölgesi · ${String(province.plate).padStart(2, "0")}`}
          </p>
          <h1 className="font-display mt-4 text-display-xl">{district ? district.name : side ? ISTANBUL_SIDES[side].name : province.name}</h1>
          {showSides ? (
            <div className="mt-5">
              <IstanbulSideTabs active={side} allHref={path} hrefFor={(s) => `${path}?yaka=${s}`} counts={istanbulSideCounts(counts)} />
            </div>
          ) : null}
          <p className="mt-5 max-w-[56ch] text-lede text-muted-foreground">
            {seo?.intro ??
              (total > 0
                ? `${place} bölgesinde şu anda ${total} yayında profil bulunuyor.`
                : `${place} için henüz yayında profil bulunmuyor. Yakın illere göz atabilir veya daha sonra tekrar kontrol edebilirsiniz.`)}
          </p>
        </div>
        <dl className="grid grid-cols-2 border-t border-hairline lg:col-span-4 lg:col-start-9 lg:border-t-0">
          <Stat label="Profil" value={formatNumber(total)} />
          <Stat label={district ? "Nüfus" : "İlçe"} value={district ? formatNumber(district.population) : String(sideDistricts?.length ?? listDistricts(province.plate).length)} />
        </dl>
      </header>

      <Suspense fallback={<ProfileListingSkeleton />}>
        <LocationResults province={province} district={district} searchParams={searchParams} />
      </Suspense>

      {!district && listedDistricts.length ? (
        <section className="mt-12 grid gap-6 border-t border-hairline pt-10 lg:grid-cols-12" aria-labelledby="ilce-baslik">
          <h2 id="ilce-baslik" className="font-display text-display-md lg:col-span-4">{place} ilçeleri</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {listedDistricts.map((d) => (
              <li key={d.slug} className="border-b border-hairline">
                <Link href={`/sehir/${province.slug}/${d.slug}`} className="group flex min-h-12 items-baseline justify-between gap-3 py-3 pr-4">
                  <span className="font-display text-lg transition-transform group-hover:translate-x-1">{d.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{d.count} profil</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {district ? (
        <p className="mt-16 border-t border-hairline pt-8">
          <Link href={`/sehir/${province.slug}`} className="font-display text-display-sm underline-offset-[6px] decoration-1 hover:underline">
            {province.name} genelindeki tüm profiller →
          </Link>
        </p>
      ) : null}
    </div>
  );
}

async function LocationResults({ province, district, searchParams }: { province: Province; district?: District; searchParams: SearchParams }) {
  const raw = parseFilters(await searchParams);
  const filters = { ...raw, il: province.slug, ilce: district?.slug };
  return <ProfileListing filters={filters} mode={{ type: "location", il: province.slug }} />;
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
