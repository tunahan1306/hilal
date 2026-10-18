import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocationPage, LocationPageSkeleton } from "@/components/site/location-page";
import { getLocale } from "@/i18n/server";
import { getLocationDirectory } from "@/server/queries/locations";
import { getRepository } from "@/server/repositories";
import { locationMetadata } from "@/server/queries/location-seo";

/** Yalnızca profil bulunan yerler önceden üretilir; diğerleri ilk ziyarette render edilir. */
export async function generateStaticParams() {
  const { getProvinceByPlate } = await getLocationDirectory();
  const counts = await getRepository().countPublishedByLocation();
  const params = counts
    .filter((c) => c.districtSlug)
    .map((c) => { const p = getProvinceByPlate(c.plate)!; return { country: p.country, region: p.slug, locality: c.districtSlug! }; });
  return params.length ? params : [{ country: "tr", region: "istanbul", locality: "kadikoy" }];
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[lang]/location/[country]/[region]/[locality]">): Promise<Metadata> {
  const { getProvinceIn, getDistrict } = await getLocationDirectory();
  const { country, region, locality } = await params;
  const province = getProvinceIn(country, region);
  const district = province ? getDistrict(region, locality) : undefined;
  if (!province || !district) return {};
  return locationMetadata(await getLocale(), province, district, await searchParams);
}

export default function LocalityPage({ params, searchParams }: PageProps<"/[lang]/location/[country]/[region]/[locality]">) {
  return (
    <Suspense fallback={<LocationPageSkeleton />}>
      <LocalityContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function LocalityContent({ params, searchParams }: PageProps<"/[lang]/location/[country]/[region]/[locality]">) {
  const { getProvinceIn, getDistrict } = await getLocationDirectory();
  const { country, region, locality } = await params;
  const province = getProvinceIn(country, region);
  const district = province ? getDistrict(region, locality) : undefined;
  if (!province || !district) notFound();
  return <LocationPage province={province} district={district} searchParams={searchParams} />;
}
