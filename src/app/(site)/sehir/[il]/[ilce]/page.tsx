import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocationPage, LocationPageSkeleton } from "@/components/site/location-page";
import { getLocationDirectory } from "@/server/queries/locations";
import { getLocationCounts } from "@/server/queries/public";
import { locationMetadata } from "@/server/queries/location-seo";

/** Yalnızca profil bulunan ilçeler önceden üretilir; diğerleri ilk ziyarette render edilir. */
export async function generateStaticParams() {
  const { getProvinceByPlate } = await getLocationDirectory();
  const counts = await getLocationCounts();
  const params = counts
    .filter((c) => c.districtSlug)
    .map((c) => ({ il: getProvinceByPlate(c.plate)!.slug, ilce: c.districtSlug! }));
  return params.length ? params : [{ il: "istanbul", ilce: "kadikoy" }];
}

export async function generateMetadata({ params, searchParams }: PageProps<"/sehir/[il]/[ilce]">): Promise<Metadata> {
  const { getProvince, getDistrict } = await getLocationDirectory();
  const { il, ilce } = await params;
  const province = getProvince(il);
  const district = getDistrict(il, ilce);
  if (!province || !district) return {};
  return locationMetadata(province, district, await searchParams);
}

export default function DistrictPage({ params, searchParams }: PageProps<"/sehir/[il]/[ilce]">) {
  return (
    <Suspense fallback={<LocationPageSkeleton />}>
      <DistrictContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DistrictContent({ params, searchParams }: PageProps<"/sehir/[il]/[ilce]">) {
  const { getProvince, getDistrict } = await getLocationDirectory();
  const { il, ilce } = await params;
  const province = getProvince(il);
  const district = getDistrict(il, ilce);
  if (!province || !district) notFound();
  return <LocationPage province={province} district={district} searchParams={searchParams} />;
}
