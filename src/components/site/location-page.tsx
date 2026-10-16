import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { parseFilters } from "@/domain/filters";
import { listDistricts, type District, type Province } from "@/domain/locations";
import { formatNumber } from "@/lib/site";
import { getLocationSummary, getSeoPage } from "@/server/queries/public";
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
  const path = district ? `/sehir/${province.slug}/${district.slug}` : `/sehir/${province.slug}`;
  const [summary, seo] = await Promise.all([getLocationSummary(province.slug, district?.slug), getSeoPage(path)]);
  const place = district ? `${district.name}, ${province.name}` : province.name;
  const crumbs: Crumb[] = [
    { name: "Şehirler", href: "/sehirler" },
    { name: province.name, href: `/sehir/${province.slug}` },
    ...(district ? [{ name: district.name, href: path }] : []),
  ];

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{place} sosyal profilleri</h1>
          {seo?.intro ? (
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{seo.intro}</p>
          ) : (
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              {summary.total > 0
                ? `${place} bölgesinde şu anda ${summary.total} yayında profil bulunuyor${summary.verified ? `; bunların ${summary.verified} tanesi kimlik doğrulamalı` : ""}.`
                : `${place} için henüz yayında profil bulunmuyor. Yakın illere göz atabilir veya daha sonra tekrar kontrol edebilirsiniz.`}
              {summary.topInterests.length ? ` Bu bölgedeki profillerde en sık görülen ilgi alanları: ${summary.topInterests.slice(0, 3).map((i) => i.name.toLocaleLowerCase("tr")).join(", ")}.` : ""}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-card p-4 text-sm">
          <Stat icon={Users} label="Profil" value={formatNumber(summary.total)} />
          <Stat icon={BadgeCheck} label="Doğrulanmış" value={formatNumber(summary.verified)} />
          <Stat
            icon={MapPin}
            label={district ? "Nüfus" : "İlçe"}
            value={district ? formatNumber(district.population) : String(listDistricts(province.plate).length)}
          />
          {!district ? (
            <p className="col-span-3 mt-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              {province.region} Bölgesi · Plaka {String(province.plate).padStart(2, "0")} · Nüfus {formatNumber(province.population)}
              {province.metropolitan ? " · Büyükşehir" : ""}
            </p>
          ) : null}
        </dl>
      </header>

      <Suspense fallback={<ProfileListingSkeleton />}>
        <LocationResults province={province} district={district} searchParams={searchParams} />
      </Suspense>

      {!district && summary.districts.length ? (
        <section className="mt-14" aria-labelledby="ilce-baslik">
          <h2 id="ilce-baslik" className="mb-4 text-xl font-semibold">{province.name} ilçeleri</h2>
          <ul className="flex flex-wrap gap-2">
            {summary.districts.map((d) => (
              <li key={d.slug}>
                <Link href={`/sehir/${province.slug}/${d.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm hover:bg-accent">
                  {d.name} <span className="text-muted-foreground">{d.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {district ? (
        <p className="mt-12 text-sm">
          <Link href={`/sehir/${province.slug}`} className="font-medium text-brand underline-offset-4 hover:underline">
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

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden />{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
